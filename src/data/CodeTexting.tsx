import { useRef, useState } from "react";
import { SimpleTalkingAvatar } from "@sage-rsc/talking-head-react";

interface SimpleTalkingAvatarRef {
  speakText: (text: string) => void;
  pauseSpeaking: () => void;
  resumeSpeaking: () => void;
  stopSpeaking: () => void;
  setMood: (mood: "happy" | "sad" | "neutral" | "excited") => void;
  playAnimation: (animationPath: string) => void;
}

/**
 * Example: Simple Talking Avatar with FBX Animations
 *
 * This example demonstrates how to use SimpleTalkingAvatar - a component
 * with all avatar settings but no curriculum functionality.
 * You can pass text to speak via props or use ref methods.
 *
 * HOW TO USE FBX ANIMATIONS:
 *
 * Method 1: Pass animations via props (Recommended)
 * ------------------------------------------------
 * Add an animations prop to your avatarConfig object:
 *
 * animations: {
 *     dance: "/animations/dance.fbx",
 *     idle: "/animations/Idle.fbx",
 *     happy: "/animations/Happy.fbx",
 *     // Add as many animations as you need
 * }
 *
 * Then play them using:
 * avatarRef.current.playAnimation(avatarConfig.animations.dance);
 *
 * Method 2: Play FBX directly by file path
 * -----------------------------------------
 * You can also play FBX animations directly by passing the file path:
 *
 * avatarRef.current.playAnimation("/animations/dance.fbx");
 *
 * IMPORTANT NOTES:
 * - FBX files must be placed in your public folder (or accessible via URL)
 * - Animation files should be compatible with your avatar's skeleton
 * - The avatar will automatically lock its position during FBX animations
 * - FBX animations will override code-based body movements while playing
 * - Make sure your FBX files are valid and contain animation clips
 *
 * FILE STRUCTURE:
 * /public
 *   /animations
 *     dance.fbx
 *     Idle.fbx
 *     Happy.fbx
 *     ...
 */
function CodeTexting() {
  const avatarRef = useRef<SimpleTalkingAvatarRef | null>(null);
  const [textInput, setTextInput] = useState(
    "Hello! I'm a simple talking avatar. You can make me say anything you want!"
  );

  const avatarConfig = {
    avatarUrl: "/avatars/avatar.glb",
    avatarBody: "M",
    mood: "happy",
    ttsLang: "en",
    ttsService: null as null, // Use default TTS
    bodyMovement: "gesturing",
    movementIntensity: 0.7,
    showFullAvatar: true, // Set to true for full body avatar
    cameraView: "full" as const, // Optional: "full" or "upper"
    animations: {
      dance: "/animations/dance.fbx",
      idle: "/animations/Idle.fbx",
      happy: "/animations/Happy.fbx",
    } as Record<string, string> | undefined,
  };

  const handleSpeak = () => {
    if (avatarRef.current && textInput.trim()) {
      avatarRef.current.speakText(textInput);
    }
  };

  const handlePause = () => {
    if (avatarRef.current) {
      avatarRef.current.pauseSpeaking();
    }
  };

  const handleResume = () => {
    if (avatarRef.current) {
      avatarRef.current.resumeSpeaking();
    }
  };

  const handleStop = () => {
    if (avatarRef.current) {
      avatarRef.current.stopSpeaking();
    }
  };

  const handleSetMood = (mood: "happy" | "sad" | "neutral" | "excited") => {
    if (avatarRef.current) {
      avatarRef.current.setMood(mood);
    }
  };

  // Play FBX animation by name (from animations prop)
  const handlePlayAnimation = (animationName: string) => {
    if (
      avatarRef.current &&
      avatarConfig.animations &&
      avatarConfig.animations[animationName]
    ) {
      const fbxPath = avatarConfig.animations[animationName];
      avatarRef.current.playAnimation(fbxPath);
      console.log(`Playing animation: ${animationName} from ${fbxPath}`);
    } else {
      console.warn(`Animation "${animationName}" not found in animations prop`);
    }
  };

  // Note: To play FBX animations directly by file path, you can use:
  // avatarRef.current?.playAnimation("/path/to/animation.fbx");

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#1a1a1a",
      }}
    >
      {/* Control Panel */}
      <div
        style={{
          padding: "20px",
          backgroundColor: "#2a2a2a",
          borderBottom: "2px solid #444",
          display: "flex",
          flexDirection: "column",
          gap: "15px",
        }}
      >
        <h2 style={{ color: "#fff", margin: 0 }}>Simple Talking Avatar</h2>

        {/* Text Input */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Enter text for the avatar to speak..."
            style={{
              flex: 1,
              padding: "10px",
              fontSize: "14px",
              borderRadius: "6px",
              border: "1px solid #555",
              backgroundColor: "#333",
              color: "#fff",
              minHeight: "60px",
              resize: "vertical",
            }}
          />
        </div>

        {/* Control Buttons */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={handleSpeak}
            style={{
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: "bold",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            🎤 Speak
          </button>

          <button
            onClick={handlePause}
            style={{
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: "bold",
              backgroundColor: "#FFC107",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            ⏸ Pause
          </button>

          <button
            onClick={handleResume}
            style={{
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: "bold",
              backgroundColor: "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            ▶ Resume
          </button>

          <button
            onClick={handleStop}
            style={{
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: "bold",
              backgroundColor: "#F44336",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            ⏹ Stop
          </button>
        </div>

        {/* Mood Buttons */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "10px",
          }}
        >
          <span style={{ color: "#fff", marginRight: "10px" }}>Mood:</span>
          <button
            onClick={() => handleSetMood("happy")}
            style={{
              padding: "8px 16px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            😊 Happy
          </button>
          <button
            onClick={() => handleSetMood("sad")}
            style={{
              padding: "8px 16px",
              backgroundColor: "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            😢 Sad
          </button>
          <button
            onClick={() => handleSetMood("neutral")}
            style={{
              padding: "8px 16px",
              backgroundColor: "#757575",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            😐 Neutral
          </button>
          <button
            onClick={() => handleSetMood("excited")}
            style={{
              padding: "8px 16px",
              backgroundColor: "#FF9800",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            🤩 Excited
          </button>
        </div>

        {/* FBX Animation Buttons */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ color: "#fff", marginRight: "10px" }}>
            FBX Animations:
          </span>
          {avatarConfig.animations &&
            Object.keys(avatarConfig.animations).map((animName) => (
              <button
                key={animName}
                onClick={() => handlePlayAnimation(animName)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#9C27B0",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                🎬 {animName}
              </button>
            ))}
        </div>
      </div>

      {/* Avatar Area */}
      <div style={{ flex: 1, position: "relative", backgroundColor: "#000" }}>
        <SimpleTalkingAvatar
          ref={avatarRef}
          {...avatarConfig}
          onReady={() => {
            console.log("Avatar is ready!");
          }}
          onError={(error: unknown) => {
            console.error("Avatar error:", error);
          }}
          onSpeechEnd={() => {
            console.log("Speech ended");
          }}
        />
      </div>
    </div>
  );
}

export default CodeTexting;
