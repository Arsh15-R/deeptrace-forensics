import os
import logging
from typing import Optional, List, Dict, Any
import httpx
from app.config import settings

logger = logging.getLogger("truthlens.supabase")

class SupabaseClient:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SupabaseClient, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        self.url = (settings.SUPABASE_URL or os.getenv("SUPABASE_URL", "")).rstrip("/")
        self.key = (
            settings.SUPABASE_SERVICE_ROLE_KEY or 
            os.getenv("SUPABASE_SERVICE_ROLE_KEY", "") or 
            settings.SUPABASE_KEY or 
            os.getenv("SUPABASE_KEY", "")
        )
        self.bucket = settings.SUPABASE_BUCKET_NAME or "evidence-vault"
        self.configured = bool(self.url and self.key)
        if self.configured:
            logger.info(f"Supabase configured: {self.url} (bucket: {self.bucket})")
        else:
            logger.warning("Supabase credentials not configured. Running in local air-gapped mode.")

    def _headers(self) -> Dict[str, str]:
        return {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

    def upload_file(self, file_bytes: bytes, object_name: str, content_type: str = "application/octet-stream") -> Optional[str]:
        """Uploads evidence or report asset to Supabase Storage bucket."""
        if not self.configured:
            return None

        # Check supported types on evidence-vault
        # bucket allows: 'image/jpeg', 'image/png', 'image/webp', 'audio/wav', 'audio/mpeg', 'audio/ogg', 'application/pdf'
        supported_mimes = ['image/jpeg', 'image/png', 'image/webp', 'audio/wav', 'audio/mpeg', 'audio/ogg', 'application/pdf']
        upload_mime = content_type.lower()
        if upload_mime not in supported_mimes:
            if "image" in upload_mime:
                upload_mime = "image/jpeg"
            elif "audio" in upload_mime:
                upload_mime = "audio/wav"
            elif "pdf" in upload_mime or "text" in upload_mime:
                upload_mime = "application/pdf"
            else:
                return None
        
        target_path = object_name.lstrip("/")
        endpoint = f"{self.url}/storage/v1/object/{self.bucket}/{target_path}"
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": upload_mime,
            "x-upsert": "true"
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(endpoint, headers=headers, content=file_bytes)
                if resp.status_code in [200, 201]:
                    return f"{self.bucket}/{target_path}"
                logger.warning(f"Supabase storage upload returned ({resp.status_code}): {resp.text[:150]}")
        except Exception as e:
            logger.error(f"Error uploading to Supabase storage: {e}")
        return None

    def create_signed_url(self, object_path: str, expiry_seconds: int = 3600) -> Optional[str]:
        """Creates a secure time-limited signed URL for evidence access."""
        if not self.configured:
            return None

        clean_path = object_path
        if clean_path.startswith(f"{self.bucket}/"):
            clean_path = clean_path[len(f"{self.bucket}/"):]

        endpoint = f"{self.url}/storage/v1/object/sign/{self.bucket}/{clean_path}"
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json"
        }

        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(endpoint, headers=headers, json={"expiresIn": expiry_seconds})
                if resp.status_code == 200:
                    signed_rel = resp.json().get("signedURL")
                    if signed_rel:
                        return f"{self.url}/storage/v1{signed_rel}"
        except Exception as e:
            logger.error(f"Error generating signed URL: {e}")
        return None

    def insert_record(self, table_name: str, record_dict: Dict[str, Any]) -> bool:
        """Inserts a record into specified Supabase table if table exists."""
        if not self.configured:
            return False

        endpoint = f"{self.url}/rest/v1/{table_name}"
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(endpoint, headers=self._headers(), json=record_dict)
                if resp.status_code in [200, 201]:
                    return True
                if resp.status_code != 404:
                    logger.warning(f"Supabase {table_name} insert ({resp.status_code}): {resp.text[:150]}")
        except Exception as e:
            logger.error(f"Error inserting into Supabase {table_name}: {e}")
        return False

    def insert_analysis(self, record_dict: Dict[str, Any]) -> bool:
        return self.insert_record("forensic_analyses", record_dict)

    def insert_custody_event(self, event_dict: Dict[str, Any]) -> bool:
        return self.insert_record("custody_events", event_dict)

    def get_analysis_by_id(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        rows = self.query_table("forensic_analyses", f"analysis_id=eq.{analysis_id}&limit=1")
        if rows:
            return rows[0]
        # Also check cases table
        c_rows = self.query_table("cases", f"id=eq.{analysis_id}&limit=1")
        if c_rows:
            return c_rows[0]
        return None

    def query_table(self, table_name: str, params: str = "select=*&limit=50") -> List[Dict[str, Any]]:
        """Queries rows from Supabase table."""
        if not self.configured:
            return []

        endpoint = f"{self.url}/rest/v1/{table_name}?{params}"
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(endpoint, headers=self._headers())
                if resp.status_code == 200:
                    return resp.json()
        except Exception:
            pass
        return []

supabase_vault = SupabaseClient()
