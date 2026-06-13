useEffect(() => {
    // Clear and stop any active loops
    activeLoopsRef.current.forEach((loop) => loop.stop());
    activeLoopsRef.current = [];

    if (isPlaying) {
      if (realtimeSessionState === "listening") {
        // Voice-reactive mode: scale waves directly based on the live volume metering (-2 to 10)
        // Map volume (-2 to 10) to a scale factor (0.3 to 7)
        const baseScale = Math.max(0.3, Math.min(7.0, (volume + 2) / 1.7));

        anims.forEach((anim, index) => {
          const offset = 0.4 + Math.random() * 0.9;
          const targetScale = Math.max(0.3, baseScale * offset);

          Animated.spring(anim, {
            toValue: targetScale,
            friction: 4,
            tension: 50,
            useNativeDriver: true,
          }).start();
        });
      } else {
        // Thinking or Speaking mode: run fluid, beautiful synthetic waves
        const loops = anims.map((anim, index) => {
          const delay = index * 60;
          const loop = Animated.loop(
            Animated.sequence([
              Animated.delay(delay),
              Animated.timing(anim, {
                toValue: 3.2 + Math.random() * 3.2,
                duration: 300 + Math.random() * 200,
                useNativeDriver: true,
              }),
              Animated.timing(anim, {
                toValue: 0.6 + Math.random() * 0.6,
                duration: 300 + Math.random() * 200,
                useNativeDriver: true,
              }),
            ]),
          );
          loop.start();
          return loop;
        });
        activeLoopsRef.current = loops;
      }
    } else {
      // Idle state: return to calm, subtle mini bars
      anims.forEach((anim) => {
        Animated.spring(anim, {
          toValue: 0.25,
          friction: 6,
          useNativeDriver: true,
        }).start();
      });
    }

    return () => {
      activeLoopsRef.current.forEach((loop) => loop.stop());
    };
  }, [isPlaying, realtimeSessionState, volume]);

useEffect(() => {
    // Fetch live leaderboard data from Database
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/auth/leaderboard`);
        if (res.ok) {
          const data = await res.json();

          // Inject dynamic pts for the current logged-in user if they exist in the DB list
          const currentName = user?.name?.split(" ")[0] || "You";
          const myIndex = data.findIndex(
            (u) => u.name.includes(currentName) || u.name === user?.name,
          );
          if (myIndex !== -1) {
            data[myIndex].pts = myCivicPoints;
            data[myIndex].badge = myBadge;
          } else {
            data.push({
              name: currentName,
              pts: myCivicPoints,
              badge: myBadge,
            });
          }

          setLeaderboardData(data.sort((a, b) => b.pts - a.pts));
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchLeaderboard();
  }, [myRequests]);

useEffect(() => {
    (async () => {
      await Notifications.requestPermissionsAsync();
    })();
  }, []);

useEffect(() => {
    if (currentView === "media") {
      fetchMediaPosts();
    }
  }, [currentView]);

useEffect(() => {
    if (currentView !== "voice") {
      if (isVapiActiveRef.current) {
        console.log("Stopping voice agent as user exited voice view");
        isVapiActiveRef.current = false;
        Speech.stop().catch(() => {});
        setRealtimeSessionState("idle");
        setUserCaption("");
        setAiCaption("");
        setActivePopupCard(null);
      }
    }
  }, [currentView]);

useEffect(() => {
    return () => {
      isVapiActiveRef.current = false;
      Speech.stop().catch(() => {});
    };
  }, []);

useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        let location = await Location.getCurrentPositionAsync({});
        const currentLat = location.coords.latitude;
        const currentLng = location.coords.longitude;

        let geocode = await Location.reverseGeocodeAsync({
          latitude: currentLat,
          longitude: currentLng,
        });

        let area = "Chennai South";
        if (geocode && geocode.length > 0) {
          const g = geocode[0];
          // Narrow down the jurisdiction to their specific neighborhood/local area/district
          area = g.district || g.subregion || g.name || g.city;
          setUserZone(area);
        }

        // GPS Location Synchronization
        if (user) {
          const savedLat = user.latitude;
          const savedLng = user.longitude;

          if (!savedLat || !savedLng) {
            // No saved location yet: save silently
            setUserLat(currentLat);
            setUserLng(currentLng);
            saveLocationToDb(currentLat, currentLng);
          } else {
            // Compare current GPS with saved coordinates
            const diffLat = Math.abs(currentLat - savedLat);
            const diffLng = Math.abs(currentLng - savedLng);

            if (diffLat > 0.001 || diffLng > 0.001) {
              // Location changed! Update silently
              setUserLat(currentLat);
              setUserLng(currentLng);
              saveLocationToDb(currentLat, currentLng);
            } else {
              // Location matches saved coordinates
              setUserLat(savedLat);
              setUserLng(savedLng);
            }
          }
        } else {
          // Offline / guest mode: just set coords
          setUserLat(currentLat);
          setUserLng(currentLng);
        }
      } catch (err) {
        console.log(err);
      }
    })();
  }, [user]);

useEffect(() => {
    handleResetChat("smartfix");
    fetchMyRequests();
  }, []);

useEffect(() => {
    if (token) {
      const interval = setInterval(() => {
        fetchMyRequests();
      }, 10000); // Check every 10 seconds as requested
      return () => clearInterval(interval);
    }
  }, [token]);