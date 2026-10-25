export type Verdict = 'likely_authentic' | 'inconclusive' | 'likely_ai_generated';

export type Assessment = 'likely_manipulated' | 'no_strong_indicators_detected' | 'inconclusive';

export type MediaType = 'image' | 'video' | 'audio' | 'link' | 'text' | 'document';

export interface DetectorBreakdown {
  name: string;
  category: string;
  score: number;
  weight: number;
  flagged: boolean;
  status: string;
  detail: string;
}

export interface InTextMetadata {
  genre: string;
  academic?: {
    studentName?: string;
    rollNumbers?: string[];
    university?: string;
    college?: string;
    phone?: string;
    email?: string;
    declaration?: boolean;
  };
  financial?: {
    transactionIds?: string[];
    banks?: string[];
    amounts?: number[];
  };
  code?: {
    oopFeatures?: string[];
    languages?: string[];
  };
  structural?: {
    sections?: string[];
  };
  socialAttribution?: {
    authorHandle?: string;
    topic?: string;
  };
  integrityScore?: number;
  integrityStatus?: string;
}

export interface PerDetectorScores {
  pixel_patterns: number;
  face_lighting: number;
  metadata_exif: number;
  motion_temporal?: number | null;
  audio_spectral?: number | null;
  breakdown: DetectorBreakdown[];
  inTextMetadata?: InTextMetadata | null;
}

export interface VideoFrameAnalysis {
  frame_number: number;
  timestamp_seconds: number;
  score: number;
  flagged: boolean;
  anomaly_type?: string | null;
}

export interface SuspiciousRegion {
  id: string;
  label: string;
  finding: string;
  severity: 'low' | 'medium' | 'high';
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
}

export interface SuspiciousTimestamp {
  timestamp_seconds: number;
  frame_number?: number | null;
  score: number;
  anomaly_type: string;
  severity: 'low' | 'medium' | 'high';
}

export interface FlaggedPassage {
  text: string;
  reason: string;
  score: number;
  start_char?: number | null;
  end_char?: number | null;
}

export interface StandardizedAnalysisResult {
  job_id: string;
  media_type: MediaType;
  assessment: Assessment;
  assessment_label: string;
  model_name: string;
  model_version: string;
  suspicion_score: number;
  model_confidence: number;
  key_findings: string[];
  evidence_summary: string;
  suspicious_regions: SuspiciousRegion[];
  suspicious_timestamps: SuspiciousTimestamp[];
  flagged_passages: FlaggedPassage[];
  file_hash: string;
  file_size_bytes: number;
  original_filename: string;
  mime_type?: string | null;
  technical_metadata: Record<string, any>;
  processing_duration_ms: number;
  limitations: string[];
  interpretation_note: string;
}

export interface CaseRecord {
  id: string;
  case_number: string;
  officer_id: string;
  officer_name: string;
  officer_badge: string;
  department: string;
  media_type: MediaType;
  file_name?: string | null;
  source_url?: string | null;
  storage_path?: string | null;
  file_size_bytes?: number | null;
  sha256_hash: string;
  mime_type?: string | null;
  
  verdict: Verdict;
  calibrated_confidence: number;
  confidence_interval_low: number;
  confidence_interval_high: number;
  per_detector_scores: PerDetectorScores;
  
  heatmap_url?: string | null;
  heatmap_path?: string | null;
  media_url?: string | null;
  timeline_scores: VideoFrameAnalysis[];
  text_snippet?: string | null;
  
  model_name: string;
  model_version: string;
  known_error_rate_fpr: number;
  known_error_rate_fnr: number;
  limitations_notes: string;
  
  created_at: string;
  updated_at: string;
}

export interface AuditLogRecord {
  id: string;
  case_id?: string | null;
  case_number?: string | null;
  user_id: string;
  user_email: string;
  user_role: 'officer' | 'admin';
  action: string;
  ip_address?: string;
  user_agent?: string;
  details: Record<string, any>;
  created_at: string;
}

export type UserRole = 'viewer' | 'officer' | 'admin';

export interface AdminUserRecord {
  id: string;
  email: string;
  full_name: string;
  badge_number?: string | null;
  department?: string | null;
  role: UserRole;
  is_active: boolean;
  avatar_url?: string | null;
  provider: string;
  last_active_at: string;
  is_online: boolean;
  created_at: string;
  updated_at: string;
}

export interface OfficerProfile {
  id: string;
  email: string;
  full_name: string;
  badge_number: string;
  department: string;
  role: UserRole;
  avatar_url?: string | null;
  provider?: string | null;
}
