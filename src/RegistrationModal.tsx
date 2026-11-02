import React, { useState, useRef } from "react";
import "./RegistrationModal.css";

type RegistrationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (userData: { Name: string; Email: string; Avatar?: string }) => void;
};

export function RegistrationModal({ isOpen, onClose, onSuccess }: RegistrationModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  // Ref for triggering native device file picker
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Handle image selection from device gallery / files
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Please choose an image under 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      alert("Please enter both your name and email.");
      return;
    }

    const userData = {
      Name: name.trim(),
      Email: email.trim(),
      Avatar: avatarPreview || "",
    };

    // Save to localStorage for client-side auth persistence
    localStorage.setItem("revela_registered_user", JSON.stringify(userData));
    
    onSuccess(userData);
    onClose();
  };

  return (
    <div className="registration-modal-backdrop">
      <div className="registration-modal-content">
        <button type="button" className="close-btn" onClick={onClose}>
          ✕
        </button>

        <h2>Complete Registration</h2>
        <p>Upload a profile picture and enter your details to participate.</p>

        <form onSubmit={handleSubmit}>
          {/* Avatar Clickable Upload Spot */}
          <div className="avatar-picker-container">
            <div 
              className="avatar-picker-circle" 
              onClick={() => fileInputRef.current?.click()}
              title="Click to select photo"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Selected Avatar" className="avatar-preview-img" />
              ) : (
                <div className="avatar-placeholder">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  <span>Tap to Add Photo</span>
                </div>
              )}
            </div>
            
            {/* Hidden Device File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleImageChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-name">Full Name</label>
            <input
              id="reg-name"
              type="text"
              placeholder="e.g. Sarah Jenkins"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-email">Email Address</label>
            <input
              id="reg-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="submit-registration-btn">
            Save & Continue
          </button>
        </form>
      </div>
    </div>
  );
}

export default RegistrationModal;