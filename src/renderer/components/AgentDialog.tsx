import React from 'react';
import logo from '../assets/icon.png';
import { AgentInfo, AgentAuthProfile } from '@shared/types';

interface AgentDialogProps {
  agentInfo: AgentInfo | null;
  onClose: () => void;
}

export function AgentDialog({ agentInfo, onClose }: AgentDialogProps) {
  if (!agentInfo) return null;

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  const formatExpiry = (expires?: number) => {
    if (!expires) return 'No expiration';
    const now = Date.now();
    if (expires < now) return 'Expired';
    const days = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
    return `${days} day${days !== 1 ? 's' : ''} remaining`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="agent-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="agent-dialog-header">
          <div className="agent-dialog-title">
            <img src={logo} alt="ClawRap" className="agent-dialog-logo" />
            <h3>Agent Details</h3>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="agent-dialog-content">
          {/* Agent Info Card */}
          <div className="agent-info-card">
            <h4>Configuration</h4>
            <div className="agent-stat">
              <div className="stat-row">
                <span className="stat-label">Name:</span>
                <span className="stat-value">{agentInfo.name}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">ID:</span>
                <span className="stat-value">{agentInfo.id}</span>
              </div>
              {agentInfo.model && (
                <div className="stat-row">
                  <span className="stat-label">Model:</span>
                  <span className="stat-value">{agentInfo.model}</span>
                </div>
              )}
              <div className="stat-row">
                <span className="stat-label">Config Path:</span>
                <span className="stat-value stat-code">{agentInfo.configPath}</span>
              </div>
            </div>
          </div>

          {/* Auth Profiles Card */}
          <div className="agent-auth-card">
            <h4>Authentication Profiles</h4>
            {agentInfo.authProfiles.length === 0 ? (
              <p className="help-text">No authentication profiles configured</p>
            ) : (
              <div className="auth-profiles-list">
                {agentInfo.authProfiles.map((profile: AgentAuthProfile, idx: number) => (
                  <div key={idx} className="auth-profile-card">
                    <div className="auth-profile-header">
                      <span className="auth-profile-name">{profile.profileId}</span>
                      <span className={`badge ${profile.type === 'oauth' ? 'badge-primary' : 'badge-secondary'}`}>
                        {profile.type === 'oauth' ? 'OAuth' : 'API Key'}
                      </span>
                    </div>
                    <div className="auth-profile-details">
                      {profile.provider && (
                        <div className="stat-row">
                          <span className="stat-label">Provider:</span>
                          <span className="stat-value">{profile.provider}</span>
                        </div>
                      )}
                      {profile.email && (
                        <div className="stat-row">
                          <span className="stat-label">Email:</span>
                          <span className="stat-value">{profile.email}</span>
                        </div>
                      )}
                      <div className="stat-row">
                        <span className="stat-label">Status:</span>
                        <span className={`stat-value ${profile.expires && profile.expires < Date.now() ? 'error' : 'success'}`}>
                          {profile.expires && profile.expires < Date.now() ? 'Expired' : 'Active'}
                        </span>
                      </div>
                      {profile.expires && (
                        <div className="stat-row">
                          <span className="stat-label">Expires:</span>
                          <span className="stat-value">{formatExpiry(profile.expires)}</span>
                        </div>
                      )}
                      {profile.created && (
                        <div className="stat-row">
                          <span className="stat-label">Created:</span>
                          <span className="stat-value">{formatTime(profile.created)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
