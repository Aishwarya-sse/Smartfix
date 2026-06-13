const fs = require('fs');

function processFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Premium professional template wrapper
  const oldWrapper1 = /<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">/g;
  const oldWrapper2 = /<div style="font-family: sans-serif; padding: 20px; border-radius: 12px; background-color: #f3f4f6; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb;">/g;
  
  const newWrapper = '<div style="font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); color: #334155; line-height: 1.6;">';
  
  content = content.replace(oldWrapper1, newWrapper);
  content = content.replace(oldWrapper2, newWrapper);
  
  // Update header colors and borders
  content = content.replace(/color: #6366f1/g, 'color: #a284f9');
  content = content.replace(/border-bottom: 2px solid #6366f1/g, 'border-bottom: 2px solid #a284f9');
  content = content.replace(/color: #4f46e5/g, 'color: #a284f9'); // update other indigos
  
  // Make inner boxes look more premium
  const oldInnerBox1 = /<div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">/g;
  const oldInnerBox2 = /<div style="background-color: #ffffff; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e5e7eb;">/g;
  
  const newInnerBox = '<div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #e2e8f0; color: #475569;">';
  
  content = content.replace(oldInnerBox1, newInnerBox);
  content = content.replace(oldInnerBox2, newInnerBox);
  
  // Make text look better
  content = content.replace(/<p>/g, '<p style="color: #334155; font-size: 16px;">');
  
  // Remove emojis
  content = content.replace(/🌟/g, '');
  content = content.replace(/🛠️/g, '');
  content = content.replace(/✅/g, '');
  content = content.replace(/❌/g, '');
  content = content.replace(/🤖/g, '');
  content = content.replace(/📧/g, '');
  content = content.replace(/🔑/g, '');
  content = content.replace(/🌟/g, '');

  fs.writeFileSync(filePath, content, 'utf8');
}

processFile('C:/gigs/Savita Engineering College/SmartFix/backend/src/controllers/requestController.js');
processFile('C:/gigs/Savita Engineering College/SmartFix/backend/src/controllers/authController.js');
processFile('C:/gigs/Savita Engineering College/SmartFix/backend/src/controllers/media.js'); 
console.log('Done replacing templates.');
