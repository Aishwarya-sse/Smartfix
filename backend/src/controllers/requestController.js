const getModels = () => require('../models');
const { sendEmail } = require('../services/emailService');

// Haversine formula to compute distance in kilometers
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Check for partners and create/assign request
exports.createRequest = async (req, res) => {
  try {
    const { category, title, description, dueDate, latitude, longitude, conversationId, citizenImage } = req.body;
    const userId = req.user.id;
    const { User, Request, Conversation } = getModels();
    const { uploadMedia } = require('../services/cloudinaryService');

    let finalCategory = category;
    let finalTitle = title;
    let finalDescription = description;

    // Agentic AI generation if category/description are missing or if conversationId is provided
    if (conversationId && (!finalCategory || !finalDescription)) {
      const conversation = await Conversation.findById(conversationId);
      if (conversation && conversation.messages && conversation.messages.length > 0) {
        console.log(" [AI Agent] Invoking Gemini to analyze conversation history and generate request details...");
        const geminiService = require('../services/geminiService');
        const generated = await geminiService.generateRequestDetails(conversation.messages, latitude, longitude);
        finalCategory = generated.category;
        finalTitle = generated.title;
        finalDescription = generated.description;
      }
    }

    if (!finalCategory || !finalDescription || !latitude || !longitude) {
      return res.status(400).json({ error: 'Missing required request parameters' });
    }

    // Find all active partners matching the specific category
    const partners = await User.find({
      role: 'partner',
      isVerified: true,
      partnerCategory: finalCategory,
      isAvailable: true
    });

    let assignedPartner = null;
    let closestDistance = Infinity;
    let fallbackPartners = [];

    // Filter partners by distance
    partners.forEach(partner => {
      if (partner.latitude && partner.longitude) {
        const dist = calculateDistance(latitude, longitude, partner.latitude, partner.longitude);
        if (dist <= 2.5) { // Active local area limit (2.5 km)
          if (dist < closestDistance) {
            closestDistance = dist;
            assignedPartner = partner;
          }
        } else if (dist <= 15.0) { // Fallback nearby limit (15 km)
          fallbackPartners.push({ partner, distance: dist });
        }
      }
    });

    // Calculate agentic due date based on category urgency
    let resolutionHours = 48; // default
    if (finalCategory === 'electricity') {
      resolutionHours = 12; // Extremely critical safety risk
    } else if (finalCategory === 'water') {
      resolutionHours = 24; // Water wastage & flooding risk
    } else if (finalCategory === 'garbage') {
      resolutionHours = 48; // Sanitation & odor risk
    } else if (finalCategory === 'roads') {
      resolutionHours = 72; // Infrastructure repair timeframe
    }
    const computedDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + resolutionHours * 60 * 60 * 1000);

    // Upload citizen image to Cloudinary if provided
    let uploadedCitizenImage = citizenImage;
    if (citizenImage) {
      const secureUrl = await uploadMedia(citizenImage);
      if (secureUrl) uploadedCitizenImage = secureUrl;
    }

    // Create the service request
    const newRequest = await Request.create({
      user: userId,
      partner: assignedPartner ? assignedPartner._id : null,
      category: finalCategory,
      title: finalTitle || 'Civic Issue Report',
      description: finalDescription,
      dueDate: computedDueDate,
      latitude,
      longitude,
      status: assignedPartner ? 'Assigned' : 'Pending',
      assignedAt: assignedPartner ? new Date() : undefined,
      conversationId,
      citizenImage: uploadedCitizenImage || null
    });

    // Handle results
    if (assignedPartner) {
      // Send email alert to partner
      const emailSubject = `[URGENT] New ${finalCategory.toUpperCase()} Job Assigned - SmartFix`;
      const emailText = `Hello ${assignedPartner.name},\n\nYou have been assigned a new complaint in your area.\n\nCategory: ${finalCategory.toUpperCase()}\nDescription: ${finalDescription}\nLocation: (${latitude}, ${longitude})\n\nPlease open the SmartFix app to accept and navigate to the job details.`;
      
      const emailHtml = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); color: #334155; line-height: 1.6;">
          <h2 style="color: #a284f9; text-align: center;">New Job Assignment</h2>
          <p style="color: #334155; font-size: 16px;">Hello <strong>${assignedPartner.name}</strong>,</p>
          <p style="color: #334155; font-size: 16px;">You have been automatically matched with a municipal complaint in your area (Distance: ${closestDistance.toFixed(2)} km):</p>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #e2e8f0; color: #475569;">
            <p style="margin: 5px 0;"><strong>Category:</strong> ${finalCategory.toUpperCase()}</p>
            <p style="margin: 5px 0;"><strong>Description:</strong> ${finalDescription}</p>
            <p style="margin: 5px 0;"><strong>Location Coordinates:</strong> ${latitude.toFixed(5)}, ${longitude.toFixed(5)}</p>
          </div>
          <p style="color: #334155; font-size: 16px;">Please log in to your dashboard to view the job on the map and mark it 'In Progress'.</p>
        </div>
      `;

      await sendEmail(assignedPartner.email, emailSubject, emailText, emailHtml);

      return res.status(201).json({
        message: 'Request raised and partner assigned successfully!',
        request: newRequest,
        assigned: true,
        partner: {
          id: assignedPartner._id,
          name: assignedPartner.name,
          distance: closestDistance
        }
      });
    } else {
      // No immediate partner. Check if there are fallback partners nearby.
      if (fallbackPartners.length > 0) {
        // Sort fallback partners by distance
        fallbackPartners.sort((a, b) => a.distance - b.distance);
        const nearestFallback = fallbackPartners[0];

        return res.status(201).json({
          message: 'No immediate partner found within 2.5km, but nearby partners exist.',
          request: newRequest,
          assigned: false,
          fallbackAvailable: true,
          fallbackPartner: {
            id: nearestFallback.partner._id,
            name: nearestFallback.partner.name,
            distance: nearestFallback.distance
          }
        });
      }

      return res.status(201).json({
        message: 'Request registered. Seeking available partners...',
        request: newRequest,
        assigned: false,
        fallbackAvailable: false
      });
    }
  } catch (error) {
    console.error(' [Create Request Error]:', error);
    res.status(500).json({ error: 'Server error while raising request.' });
  }
};

// Assign a specific partner (e.g. after user confirms fallback)
exports.assignPartner = async (req, res) => {
  try {
    const { requestId, partnerId } = req.body;
    const { Request, User } = getModels();

    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const partner = await User.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    request.partner = partner._id;
    request.status = 'Assigned';
    request.assignedAt = new Date();
    await request.save();

    // Send email alert to partner
    const emailSubject = `[ASSIGNED] Nearby Fallback ${request.category.toUpperCase()} Job - SmartFix`;
    const emailText = `Hello ${partner.name},\n\nYou have been assigned as a nearby fallback partner for a complaint.\n\nCategory: ${request.category.toUpperCase()}\nDescription: ${request.description}\nLocation: (${request.latitude}, ${request.longitude})`;
    
    await sendEmail(partner.email, emailSubject, emailText);

    res.status(200).json({
      message: 'Partner successfully assigned to request.',
      request
    });
  } catch (error) {
    console.error(' [Assign Partner Error]:', error);
    res.status(500).json({ error: 'Server error during partner assignment.' });
  }
};

// Escalate a request to human support
exports.escalateRequest = async (req, res) => {
  try {
    const { requestId, escalationNotes, emailDraft } = req.body;
    const { Request } = getModels();

    const request = await Request.findById(requestId);
    if (!request) {
      // Create a temporary mock request if we are in chat mode before request is raised
      const supportEmail = process.env.SUPPORT_EMAIL || 'support@smartfix.com';
      await sendEmail(
        supportEmail,
        `[ESCALATED PUBLIC GRIEVANCE] Urgent Action Required`,
        emailDraft || `Urgent issue: ${escalationNotes}`
      );
      return res.status(200).json({
        message: 'Grievance escalated to support executive successfully.',
        escalated: true
      });
    }

    request.status = 'Escalated';
    request.escalatedAt = new Date();
    request.escalationNotes = escalationNotes || 'Escalated via AI dialogue.';
    await request.save();

    // Send Escalation Email to Human Executive
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@smartfix.com';
    const emailSubject = `[ESCALATED PUBLIC GRIEVANCE] ID: ${request._id} - SmartFix`;
    const textBody = `
      ATTENTION SUPPORT TEAM,\n\nA complaint has been escalated to human intervention.\n\n
      Complaint ID: ${request._id}\n
      Category: ${request.category.toUpperCase()}\n
      Description: ${request.description}\n
      Location: (${request.latitude}, ${request.longitude})\n
      Escalation Details: ${request.escalationNotes}\n
      Please contact the user immediately to resolve.
    `;

    await sendEmail(supportEmail, emailSubject, textBody);

    res.status(200).json({
      message: 'Request successfully escalated to Human Executive.',
      request
    });
  } catch (error) {
    console.error(' [Escalate Request Error]:', error);
    res.status(500).json({ error: 'Server error during escalation.' });
  }
};

// Retrieve requests for citizen
exports.getUserRequests = async (req, res) => {
  try {
    const { Request } = getModels();
    const requests = await Request.find({ user: req.user.id })
      .populate('partner', 'name email phone partnerCategory')
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    console.error(' [Get User Requests Error]:', error);
    res.status(500).json({ error: 'Server error retrieving requests.' });
  }
};

// Retrieve requests for service partner
exports.getPartnerRequests = async (req, res) => {
  try {
    const { Request, User } = getModels();
    
    // Fetch partner details to identify their specialty domain category
    const partnerUser = await User.findById(req.user.id);
    const partnerCat = partnerUser ? partnerUser.partnerCategory : 'other';
    const currentPartnerId = req.user.id;

    // Retrieve all municipal complaints and populate user and partner descriptors
    const allRequests = await Request.find()
      .populate('user', 'name email')
      .populate('partner', 'name email phone partnerCategory');

    // Filter: Only return requests relevant to this partner
    // - Pending with no partner assigned (visible to all partners to pick up)
    // - Assigned / Scheduled / In Progress / Resolved / Done that belong to THIS partner
    const relevantRequests = allRequests.filter(r => {
      // Unassigned pending tasks are visible to all
      if (r.status === 'Pending' && !r.partner) return true;

      // Tasks owned by this partner are always visible to them
      const assignedPartnerId = r.partner?._id?.toString() || r.partner?.toString();
      if (assignedPartnerId && assignedPartnerId === currentPartnerId) return true;

      // Tasks that are Done/Resolved with no partner (edge case) are hidden
      return false;
    });

    // Prioritize: Matching specialty category first, then others. Within each group, sort by createdAt descending.
    const prioritized = relevantRequests.sort((a, b) => {
      const aMatch = (a.category || "").toLowerCase() === (partnerCat || "").toLowerCase() ? 1 : 0;
      const bMatch = (b.category || "").toLowerCase() === (partnerCat || "").toLowerCase() ? 1 : 0;
      
      if (aMatch !== bMatch) {
        return bMatch - aMatch; // 1 (matched) comes before 0 (unmatched)
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.status(200).json(prioritized);
  } catch (error) {
    console.error('[Get Partner Requests Error]:', error);
    res.status(500).json({ error: 'Server error retrieving partner requests.' });
  }
};

// Partner updates job status
exports.updateRequestStatus = async (req, res) => {
  try {
    const { requestId, status } = req.body;
    const { Request, User } = getModels();

    if (!['Scheduled', 'In Progress', 'Resolved', 'Done'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status transition' });
    }

    const request = await Request.findById(requestId)
      .populate('user', 'name email')
      .populate('partner', 'name phone partnerCategory');

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Security check
    const partnerIdStr = request.partner?._id?.toString() || request.partner?.toString();
    if (partnerIdStr && partnerIdStr !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to modify this request' });
    }

    const { uploadMedia } = require('../services/cloudinaryService');
    request.status = status;
    if (status === 'Resolved' || status === 'Done') {
      request.resolvedAt = new Date();
      if (req.body.resolutionImage) {
        const secureUrl = await uploadMedia(req.body.resolutionImage);
        request.resolutionImage = secureUrl || req.body.resolutionImage;
      }
      if (req.body.resolutionLatitude) {
        request.resolutionLatitude = req.body.resolutionLatitude;
      }
      if (req.body.resolutionLongitude) {
        request.resolutionLongitude = req.body.resolutionLongitude;
      }
      if (req.body.resolutionLocationName) {
        request.resolutionLocationName = req.body.resolutionLocationName;
      }
    }
    await request.save();

    // Send email notification to citizen on status updates (In Progress or Resolved)
    const citizenEmail = request.user?.email;
    if (citizenEmail) {
      let subject = `[SmartFix] Update on Your Ticket: ${request.title}`;
      let text = `Hello ${request.user.name},\n\nYour civic complaint "${request.title}" has been updated.\n\nNew Status: ${status.toUpperCase()}\nTechnician: ${request.partner?.name || 'Municipal Partner'}\n\nPlease check the SmartFix app for real-time progress details.`;
      let html = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); color: #334155; line-height: 1.6;">
          <h2 style="color: #a284f9; border-bottom: 2px solid #a284f9; padding-bottom: 10px; margin-top: 0;">SmartFix Ticket Updated!</h2>
          <p style="color: #334155; font-size: 16px;">Hello <strong>${request.user.name}</strong>,</p>
          <p style="color: #334155; font-size: 16px;">Your civic complaint status has been updated by our service partner.</p>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #e2e8f0; color: #475569;">
            <p style="margin: 5px 0;"><strong>Complaint Title:</strong> ${request.title}</p>
            <p style="margin: 5px 0;"><strong>Category:</strong> ${request.category.toUpperCase()}</p>
            <p style="margin: 5px 0;"><strong>Technician Assigned:</strong> ${request.partner?.name || 'Municipal Partner'}</p>
            <p style="margin: 5px 0; font-size: 16px; color: #a284f9;"><strong>New Roadmap Status:</strong> ${status.toUpperCase()}</p>
          </div>
      `;

      if (status === 'In Progress') {
        subject = `[SmartFix] Repair Operations Initiated for Ticket: ${request.title}`;
        text = `Hello ${request.user.name},\n\nActive repair and operations have been initiated for your complaint: "${request.title}".\n\nTechnician: ${request.partner?.name || 'Municipal Partner'}\n\nThe technician is actively working on resolving the issue on site.`;
        html += `<p style="color: #334155; font-size: 16px;">Our technician is on-site and has initiated active repair/clean-up operations. We will keep you updated!</p>`;
      } else if (status === 'Resolved' || status === 'Done') {
        subject = `[SmartFix] Civic Issue Resolved! Verified Completion Proof Uploaded`;
        text = `Hello ${request.user.name},\n\nGreat news! Your complaint "${request.title}" is marked as Fixed and Resolved.\n\nTechnician: ${request.partner?.name || 'Municipal Partner'}\n\nPlease open the SmartFix app, inspect the completion GPS proof, and submit your rating feedback.`;
        html += `<p style="color: #334155; font-size: 16px;">Wonderful! The technician has successfully completed all repair operations on-site. Completion GPS photos and proof have been uploaded.</p>
                 <p style="margin-top: 15px; font-weight: bold; color: #a284f9;">Please open the SmartFix app, review the work, and submit your rating feedback to close the ticket!</p>`;
      }

      html += `
          <p style="margin-top: 20px; font-size: 12.5px; color: #6b7280;">Thank you for helping us keep our neighborhood clean and safe!</p>
        </div>
      `;

      await sendEmail(citizenEmail, subject, text, html);
    }

    // Simulated mobile push notification log
    console.log(`[SIMULATED MOBILE PUSH NOTIFICATION]: Sent alert to user ${request.user?._id || request.user} - "Ticket ${requestId.toString().substring(18)} status updated to ${status}"`);

    res.status(200).json({
      message: `Job status successfully updated to: ${status}`,
      request
    });
  } catch (error) {
    console.error('[Update Request Status Error]:', error);
    res.status(500).json({ error: 'Server error updating status.' });
  }
};

// Partner picks up an unassigned task
exports.pickupRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const { Request, User } = getModels();

    const partner = await User.findById(req.user.id);
    if (!partner || partner.role !== 'partner') {
      return res.status(403).json({ error: 'Only service partners can pick up tasks' });
    }

    // Atomic update: only pick up if task is still Pending and has no partner assigned
    // This prevents two partners from grabbing the same job simultaneously
    const request = await Request.findOneAndUpdate(
      {
        _id: requestId,
        status: 'Pending',
        partner: null  // Only claim if still unclaimed
      },
      {
        partner: partner._id,
        status: 'Assigned',
        assignedAt: new Date()
      },
      { new: true }
    ).populate('user', 'name email');

    if (!request) {
      // Task was already picked up by another partner or doesn't exist
      return res.status(409).json({ error: 'This task has already been picked up by another partner or is no longer available.' });
    }

    // Send email notification to user
    const citizenEmail = request.user?.email;
    if (citizenEmail) {
      const subject = `[SmartFix] Your task has been picked up by ${partner.name}!`;
      const text = `Hello ${request.user.name},\n\nGreat news! Your civic complaint "${request.title}" has been picked up by our partner ${partner.name}.\n\nCategory: ${request.category.toUpperCase()}\nTechnician Specialty: ${partner.partnerCategory || 'General Service'}\nContact Phone: ${partner.phone || 'N/A'}\n\nThe technician is reviewing your issue details and will schedule or begin work shortly.`;
      const html = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); color: #334155; line-height: 1.6;">
          <h2 style="color: #a284f9; border-bottom: 2px solid #a284f9; padding-bottom: 10px; margin-top: 0;">SmartFix Service Picked Up!</h2>
          <p style="color: #334155; font-size: 16px;">Hello <strong>${request.user.name}</strong>,</p>
          <p style="color: #334155; font-size: 16px;">Your civic complaint has been successfully picked up by a local technician.</p>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #e2e8f0; color: #475569;">
            <p style="margin: 5px 0;"><strong>Complaint Title:</strong> ${request.title}</p>
            <p style="margin: 5px 0;"><strong>Category:</strong> ${request.category.toUpperCase()}</p>
            <p style="margin: 5px 0;"><strong>Partner Assigned:</strong> ${partner.name}</p>
            <p style="margin: 5px 0;"><strong>Specialty:</strong> ${partner.partnerCategory || 'General'}</p>
            <p style="margin: 5px 0;"><strong>Technician Phone:</strong> ${partner.phone || 'Not provided'}</p>
          </div>
          <p style="color: #334155; font-size: 16px;">The technician will coordinate schedule details soon. Thank you for using SmartFix!</p>
        </div>
      `;
      await sendEmail(citizenEmail, subject, text, html);
    }

    // Simulated mobile push notification log
    console.log(`[SIMULATED MOBILE PUSH NOTIFICATION]: Sent alert to user ${request.user?._id || request.user} - "Ticket ${requestId.toString().substring(18)} assigned to ${partner.name}"`);

    res.status(200).json({
      message: 'Task successfully picked up',
      request,
      partner
    });
  } catch (error) {
    console.error('[Pickup Request Error]:', error);
    res.status(500).json({ error: 'Server error during task pickup.' });
  }
};

// Partner schedules a task
exports.scheduleRequest = async (req, res) => {
  try {
    const { requestId, scheduledDate, scheduledTime } = req.body;
    const { Request, User } = getModels();

    const request = await Request.findById(requestId)
      .populate('user', 'name email')
      .populate('partner', 'name phone partnerCategory');

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const partnerIdStr = request.partner?._id?.toString() || request.partner?.toString();
    if (partnerIdStr && partnerIdStr !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to modify this request' });
    }

    request.status = 'Scheduled';
    request.scheduledDate = new Date(scheduledDate);
    request.scheduledTime = scheduledTime;
    await request.save();

    // Send email notification to citizen
    const citizenEmail = request.user?.email;
    if (citizenEmail) {
      const formattedDate = new Date(scheduledDate).toLocaleDateString();
      const subject = `[SmartFix] Visit Scheduled for Your Ticket: ${request.title}`;
      const text = `Hello ${request.user.name},\n\nYour civic complaint "${request.title}" has been scheduled by our technician, ${request.partner?.name || 'Municipal Partner'}.\n\nScheduled Date: ${formattedDate}\nScheduled Time Slot: ${scheduledTime || 'TBD'}\nCategory: ${request.category.toUpperCase()}\n\nPlease be prepared for the technician's visit. Thank you for using SmartFix!`;
      const html = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); color: #334155; line-height: 1.6;">
          <h2 style="color: #a284f9; border-bottom: 2px solid #a284f9; padding-bottom: 10px; margin-top: 0;">SmartFix Service Visit Scheduled!</h2>
          <p style="color: #334155; font-size: 16px;">Hello <strong>${request.user.name}</strong>,</p>
          <p style="color: #334155; font-size: 16px;">Your civic complaint has been scheduled for resolution by our assigned service partner.</p>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #e2e8f0; color: #475569;">
            <p style="margin: 5px 0;"><strong>Complaint Title:</strong> ${request.title}</p>
            <p style="margin: 5px 0;"><strong>Category:</strong> ${request.category.toUpperCase()}</p>
            <p style="margin: 5px 0;"><strong>Partner Assigned:</strong> ${request.partner?.name || 'Municipal Partner'}</p>
            <p style="margin: 5px 0;"><strong>Scheduled Visit:</strong> ${formattedDate} at ${scheduledTime || 'TBD'}</p>
            <p style="margin: 5px 0;"><strong>Technician Phone:</strong> ${request.partner?.phone || 'Not provided'}</p>
          </div>
          <p style="color: #334155; font-size: 16px;">The technician will arrive at the logged location inside the scheduled slot. Thank you for your patience!</p>
        </div>
      `;
      await sendEmail(citizenEmail, subject, text, html);
    }

    // Simulated mobile push notification log
    console.log(`[SIMULATED MOBILE PUSH NOTIFICATION]: Sent alert to user ${request.user?._id || request.user} - "Ticket ${requestId.toString().substring(18)} scheduled for ${new Date(scheduledDate).toLocaleDateString()}"`);

    res.status(200).json({
      message: 'Task successfully scheduled',
      request
    });
  } catch (error) {
    console.error('[Schedule Request Error]:', error);
    res.status(500).json({ error: 'Server error during task scheduling.' });
  }
};

// Submit rating and feedback for a resolved request
exports.submitFeedback = async (req, res) => {
  try {
    const { requestId, rating, feedback } = req.body;
    const { Request, User } = getModels();

    const request = await Request.findById(requestId).populate('user', 'name');
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Security check - only the reporter user can submit feedback
    if (request.user?._id?.toString() !== req.user.id && request.user?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to submit feedback for this request' });
    }

    request.rating = rating;
    request.feedback = feedback;
    request.status = 'Done'; // Transition fully to Done
    await request.save();

    // Reward partner with additional civic rating points
    if (request.partner) {
      const partner = await User.findById(request.partner);
      if (partner) {
        const addedPoints = rating * 20;
        partner.civicPoints = (partner.civicPoints || 0) + addedPoints;
        // Automatically check if tier should upgrade
        if (partner.civicPoints >= 1000) partner.badge = 'Platinum';
        else if (partner.civicPoints >= 500) partner.badge = 'Gold';
        else if (partner.civicPoints >= 250) partner.badge = 'Silver';
        await partner.save();

        // Send email to partner to congratulate them
        if (partner.email) {
          const subject = `[SmartFix] Congratulations! You received a ${rating}-star rating!`;
          const text = `Hello ${partner.name},\n\nGreat news! The citizen ${request.user?.name || 'User'} has submitted a ${rating}-star rating and feedback for your completion of: "${request.title}".\n\nFeedback Comment: "${feedback || 'No comments'}"\nPoints Received: +${addedPoints} PTS\nYour Total Civic Points: ${partner.civicPoints} PTS (Tier: ${partner.badge})\n\nThank you for your excellent service!`;
          const html = `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); color: #334155; line-height: 1.6;">
              <h2 style="color: #a284f9; border-bottom: 2px solid #a284f9; padding-bottom: 10px; margin-top: 0;">Excellent Service! Rating Feedback Received </h2>
              <p style="color: #334155; font-size: 16px;">Hello <strong>${partner.name}</strong>,</p>
              <p style="color: #334155; font-size: 16px;">Outstanding work! A citizen has reviewed your resolution on-site and submitted rating feedback:</p>
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #e2e8f0; color: #475569;">
                <p style="margin: 5px 0;"><strong>Job Title:</strong> ${request.title}</p>
                <p style="margin: 5px 0; font-size: 16px; color: #eab308; font-weight: bold;"><strong>Rating Score:</strong> ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} (${rating} / 5 Stars)</p>
                <p style="margin: 5px 0;"><strong>Citizen Feedback:</strong> "${feedback || 'No comments'}"</p>
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 10px 0;" />
                <p style="margin: 5px 0; font-weight: bold; color: #10b981;"><strong>Civic Points Earned:</strong> +${addedPoints} PTS</p>
                <p style="margin: 5px 0;"><strong>Your Total Points:</strong> ${partner.civicPoints} PTS (Tier: ${partner.badge})</p>
              </div>
              <p style="color: #334155; font-size: 16px;">Thank you for your dedication to restoring civic health. Keep up the amazing work!</p>
            </div>
          `;
          await sendEmail(partner.email, subject, text, html);
        }

        // Simulated push notification to partner
        console.log(`[SIMULATED MOBILE PUSH NOTIFICATION]: Sent alert to partner ${partner._id} - "You earned +${addedPoints} PTS from a ${rating}-star feedback rating"`);
      }
    }

    const populatedRequest = await Request.findById(request._id)
      .populate('user', 'name email')
      .populate('partner', 'name email phone partnerCategory');

    res.status(200).json({
      message: 'Feedback successfully submitted',
      request: populatedRequest
    });
  } catch (error) {
    console.error('[Submit Feedback Error]:', error);
    res.status(500).json({ error: 'Server error during feedback submission.' });
  }
};

// Admin gets all municipal requests in the system
exports.adminGetAllRequests = async (req, res) => {
  try {
    const { Request } = getModels();
    const requests = await Request.find()
      .populate('user', 'name email')
      .populate('partner', 'name email phone partnerCategory')
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    console.error(' [Admin Get Requests Error]:', error);
    res.status(500).json({ error: 'Server error retrieving municipal requests.' });
  }
};

// Admin gets all active service partners in the system
exports.adminGetAllPartners = async (req, res) => {
  try {
    const { User } = getModels();
    const partners = await User.find({ role: 'partner', isVerified: true })
      .select('name email phone partnerCategory civicPoints badge isAvailable')
      .sort({ name: 1 });

    res.status(200).json(partners);
  } catch (error) {
    console.error(' [Admin Get Partners Error]:', error);
    res.status(500).json({ error: 'Server error retrieving service partners.' });
  }
};

// Admin reassigns any civic request to another technician
exports.adminReassignRequest = async (req, res) => {
  try {
    const { requestId, partnerId } = req.body;
    const { Request, User } = getModels();

    const request = await Request.findById(requestId).populate('user', 'name email');
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const partner = await User.findById(partnerId);
    if (!partner || partner.role !== 'partner') {
      return res.status(404).json({ error: 'Selected technician not found' });
    }

    request.partner = partner._id;
    request.status = 'Assigned';
    request.assignedAt = new Date();
    await request.save();

    // Send email alert to reporting citizen
    const citizenEmail = request.user?.email;
    if (citizenEmail) {
      const subject = `[SmartFix] Technician Reassigned for Ticket: ${request.title}`;
      const text = `Hello ${request.user.name},\n\nYour civic complaint "${request.title}" has been reassigned to technician ${partner.name} by the Municipal Admin.\n\nTechnician Specialty: ${partner.partnerCategory || 'General Service'}\nContact Phone: ${partner.phone || 'N/A'}\n\nPlease check the SmartFix app for real-time progress details.`;
      const html = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); color: #334155; line-height: 1.6;">
          <h2 style="color: #a284f9; border-bottom: 2px solid #a284f9; padding-bottom: 10px; margin-top: 0;">SmartFix Task Reassigned!</h2>
          <p style="color: #334155; font-size: 16px;">Hello <strong>${request.user.name}</strong>,</p>
          <p style="color: #334155; font-size: 16px;">Your municipal complaint has been reassigned to a new technician by our system administrator.</p>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #e2e8f0; color: #475569;">
            <p style="margin: 5px 0;"><strong>Complaint Title:</strong> ${request.title}</p>
            <p style="margin: 5px 0;"><strong>Category:</strong> ${request.category.toUpperCase()}</p>
            <p style="margin: 5px 0; font-size: 16px; color: #a284f9;"><strong>New Technician Assigned:</strong> ${partner.name}</p>
            <p style="margin: 5px 0;"><strong>Specialty:</strong> ${partner.partnerCategory || 'General'}</p>
            <p style="margin: 5px 0;"><strong>Technician Phone:</strong> ${partner.phone || 'Not provided'}</p>
          </div>
          <p style="color: #334155; font-size: 16px;">The new technician has been alerted and will coordinate scheduled repairs soon. Thank you!</p>
        </div>
      `;
      await sendEmail(citizenEmail, subject, text, html);
    }

    // Send email alert to new technician
    if (partner.email) {
      const partnerSubject = `[URGENT REASSIGNMENT] ID: ${request._id} - SmartFix`;
      const partnerText = `Hello ${partner.name},\n\nYou have been assigned to resolve a complaint by the administrator.\n\nCategory: ${request.category.toUpperCase()}\nDescription: ${request.description}\nLocation: (${request.latitude}, ${request.longitude})\n\nPlease open the SmartFix app to view details.`;
      const partnerHtml = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); color: #334155; line-height: 1.6;">
          <h2 style="color: #a284f9; text-align: center;">New Job Reassignment</h2>
          <p style="color: #334155; font-size: 16px;">Hello <strong>${partner.name}</strong>,</p>
          <p style="color: #334155; font-size: 16px;">The system administrator has assigned a municipal complaint to you:</p>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #e2e8f0; color: #475569;">
            <p style="margin: 5px 0;"><strong>Category:</strong> ${request.category.toUpperCase()}</p>
            <p style="margin: 5px 0;"><strong>Description:</strong> ${request.description}</p>
            <p style="margin: 5px 0;"><strong>Location Coordinates:</strong> ${request.latitude.toFixed(5)}, ${request.longitude.toFixed(5)}</p>
          </div>
          <p style="color: #334155; font-size: 16px;">Please log in to your dashboard to view the job and coordinate repairs.</p>
        </div>
      `;
      await sendEmail(partner.email, partnerSubject, partnerText, partnerHtml);
    }

    // Simulated mobile push notification logs
    console.log(`[SIMULATED MOBILE PUSH NOTIFICATION]: Sent alert to user ${request.user?._id || request.user} - "Ticket ${requestId.toString().substring(18)} reassigned to ${partner.name}"`);
    console.log(`[SIMULATED MOBILE PUSH NOTIFICATION]: Sent alert to partner ${partner._id} - "New job reassigned by admin: Ticket ${requestId.toString().substring(18)}"`);

    const populatedRequest = await Request.findById(request._id)
      .populate('user', 'name email')
      .populate('partner', 'name email phone partnerCategory');

    res.status(200).json({
      message: 'Request successfully reassigned to technician.',
      request: populatedRequest
    });
  } catch (error) {
    console.error(' [Admin Reassign Request Error]:', error);
    res.status(500).json({ error: 'Server error during task reassignment.' });
  }
};

// Admin suspends any task assignment, returning it to unassigned Pending state
exports.adminSuspendRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const { Request } = getModels();

    const request = await Request.findById(requestId).populate('user', 'name email');
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    request.partner = null;
    request.status = 'Pending';
    request.assignedAt = undefined;
    request.scheduledDate = null;
    request.scheduledTime = null;
    await request.save();

    // Send email notification to citizen
    const citizenEmail = request.user?.email;
    if (citizenEmail) {
      const subject = `[SmartFix] Ticket Status Update: ${request.title}`;
      const text = `Hello ${request.user.name},\n\nYour civic complaint "${request.title}" assignment has been suspended and reset back to Pending by the Municipal Admin.\n\nWe are matching you with an alternative local technician. You will receive an alert shortly.`;
      const html = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); color: #334155; line-height: 1.6;">
          <h2 style="color: #a284f9; border-bottom: 2px solid #a284f9; padding-bottom: 10px; margin-top: 0;">SmartFix Assignment Reset</h2>
          <p style="color: #334155; font-size: 16px;">Hello <strong>${request.user.name}</strong>,</p>
          <p style="color: #334155; font-size: 16px;">Your civic complaint has been suspended and returned to the unassigned pool by the administrator.</p>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #e2e8f0; color: #475569;">
            <p style="margin: 5px 0;"><strong>Complaint Title:</strong> ${request.title}</p>
            <p style="margin: 5px 0;"><strong>Category:</strong> ${request.category.toUpperCase()}</p>
            <p style="margin: 5px 0; font-size: 16px; color: #f59e0b;"><strong>Roadmap Status:</strong> PENDING ASSIGNMENT</p>
          </div>
          <p style="color: #334155; font-size: 16px;">Our command center is seeking alternative local technicians. Thank you for your patience!</p>
        </div>
      `;
      await sendEmail(citizenEmail, subject, text, html);
    }

    // Simulated push notification
    console.log(`[SIMULATED MOBILE PUSH NOTIFICATION]: Sent alert to user ${request.user?._id || request.user} - "Ticket ${requestId.toString().substring(18)} was suspended and reset by Admin"`);

    const populatedRequest = await Request.findById(request._id)
      .populate('user', 'name email')
      .populate('partner', 'name email phone partnerCategory');

    res.status(200).json({
      message: 'Task successfully suspended and reset to unassigned Pending state.',
      request: populatedRequest
    });
  } catch (error) {
    console.error(' [Admin Suspend Request Error]:', error);
    res.status(500).json({ error: 'Server error during task suspension.' });
  }
};

// Admin fetches leaderboard
exports.adminGetLeaderboard = async (req, res) => {
  try {
    const { User } = getModels();
    const partners = await User.find({ role: 'partner', isVerified: true })
      .select('name partnerCategory civicPoints badge walletBalance')
      .sort({ civicPoints: -1 })
      .limit(20);
    res.status(200).json(partners);
  } catch (error) {
    console.error(' [Admin Get Leaderboard Error]:', error);
    res.status(500).json({ error: 'Server error retrieving leaderboard.' });
  }
};

// Partner withdraws points
exports.partnerWithdraw = async (req, res) => {
  try {
    const { pointsToWithdraw } = req.body;
    const { User } = getModels();

    if (!pointsToWithdraw || isNaN(pointsToWithdraw) || pointsToWithdraw <= 0) {
      return res.status(400).json({ error: 'Invalid points amount.' });
    }

    const partner = await User.findById(req.user.id);
    if (!partner || partner.role !== 'partner') {
      return res.status(403).json({ error: 'Only partners can withdraw points.' });
    }

    if ((partner.civicPoints || 0) < pointsToWithdraw) {
      return res.status(400).json({ error: 'Insufficient civic points.' });
    }

    // Process withdrawal
    partner.civicPoints -= pointsToWithdraw;
    const rupees = pointsToWithdraw / 2;
    await partner.save();

    // Simulated email
    if (partner.email) {
      console.log(`[EMAIL SIMULATION] To: ${partner.email}`);
      console.log(`Subject: Withdrawal Processed`);
      console.log(`Body: You have successfully withdrawn ${pointsToWithdraw} points. ₹${rupees} has been credited to your UPI account (${partner.upiAddress || 'Not Provided'}).`);
    }

    // Simulated push
    console.log(`[SIMULATED PUSH NOTIFICATION]: Sent alert to partner ${partner._id} - "₹${rupees} credited to your UPI account."`);

    res.status(200).json({ 
      message: 'Withdrawal processed successfully', 
      civicPoints: partner.civicPoints,
      amountCredited: rupees
    });
  } catch (error) {
    console.error(' [Partner Withdraw Error]:', error);
    res.status(500).json({ error: 'Server error processing withdrawal.' });
  }
};

// Admin fetches all escalated chat sessions
exports.adminGetChats = async (req, res) => {
  try {
    const { ChatSession } = getModels();
    // Only get escalated or active chats? The prompt says "If AI pushed to Human Execulation keep a new session and connect with admin."
    // Let's just fetch all 'escalated' ones.
    const chats = await ChatSession.find({ status: 'escalated' }).populate('userId', 'name email phone').sort({ updatedAt: -1 });
    res.status(200).json(chats);
  } catch (error) {
    console.error(' [Admin Get Chats Error]:', error);
    res.status(500).json({ error: 'Server error retrieving chats.' });
  }
};

// Admin replies to a chat
exports.adminReplyChat = async (req, res) => {
  try {
    const { text } = req.body;
    const { ChatSession } = getModels();

    if (!text) return res.status(400).json({ error: 'Reply text is required.' });

    const chat = await ChatSession.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Chat session not found.' });

    chat.messages.push({
      sender: 'admin',
      text: text
    });
    
    await chat.save();
    res.status(200).json(chat);
  } catch (error) {
    console.error(' [Admin Reply Chat Error]:', error);
    res.status(500).json({ error: 'Server error sending reply.' });
  }
};

// Admin closes a chat
exports.adminCloseChat = async (req, res) => {
  try {
    const { ChatSession } = getModels();

    const chat = await ChatSession.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Chat session not found.' });

    chat.status = 'closed';
    await chat.save();
    
    res.status(200).json({ message: 'Chat closed successfully.', chat });
  } catch (error) {
    console.error(' [Admin Close Chat Error]:', error);
    res.status(500).json({ error: 'Server error closing chat.' });
  }
};
