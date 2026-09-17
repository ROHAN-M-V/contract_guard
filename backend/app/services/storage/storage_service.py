import os
from pathlib import Path
from typing import Optional
import httpx
from app.core.config import settings
from app.core.logging import logger

STORAGE_LOCAL_DIR = Path("./storage_uploads")
STORAGE_LOCAL_DIR.mkdir(parents=True, exist_ok=True)


class StorageService:
    def __init__(self):
        self.bucket = settings.SUPABASE_STORAGE_BUCKET
        self.supabase_url = settings.SUPABASE_URL
        self.service_role_key = settings.SUPABASE_SERVICE_ROLE_KEY

    def _get_storage_key(self, contract_id: str, document_id: str, filename: str) -> str:
        return f"contracts/{contract_id}/{document_id}/{filename}"

    async def upload_file(
        self,
        contract_id: str,
        document_id: str,
        filename: str,
        content: bytes,
        mime_type: str = "application/pdf",
    ) -> str:
        storage_path = self._get_storage_key(contract_id, document_id, filename)

        # If Supabase credentials are configured, upload to Supabase Storage
        if self.supabase_url and self.service_role_key and "your-project" not in self.supabase_url:
            upload_url = f"{self.supabase_url}/storage/v1/object/{self.bucket}/{storage_path}"
            headers = {
                "Authorization": f"Bearer {self.service_role_key}",
                "Content-Type": mime_type,
                "x-upsert": "true",
            }
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.post(upload_url, content=content, headers=headers)
                    if resp.is_success:
                        logger.info(f"Uploaded file to Supabase Storage: {storage_path}")
                        return storage_path
            except Exception as e:
                logger.warning(f"Failed to upload to Supabase Storage: {e}. Falling back to local disk storage.")

        # Local disk fallback for local dev / offline execution
        local_path = STORAGE_LOCAL_DIR / storage_path
        local_path.parent.mkdir(parents=True, exist_ok=True)
        with open(local_path, "wb") as f:
            f.write(content)
        logger.info(f"Saved file to local storage: {local_path}")
        return storage_path

    async def create_signed_url(self, storage_path: str, expires_in: int = 3600) -> str:
        if self.supabase_url and self.service_role_key and "your-project" not in self.supabase_url:
            sign_url = f"{self.supabase_url}/storage/v1/object/sign/{self.bucket}/{storage_path}"
            headers = {
                "Authorization": f"Bearer {self.service_role_key}",
                "Content-Type": "application/json",
            }
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.post(sign_url, json={"expiresIn": expires_in}, headers=headers)
                    if resp.is_success:
                        data = resp.json()
                        signed_sub_url = data.get("signedURL")
                        return f"{self.supabase_url}/storage/v1{signed_sub_url}"
            except Exception as e:
                logger.warning(f"Failed to create signed URL from Supabase: {e}")

        # Local development signed URL fallback
        return f"/api/v1/documents/download-file?path={storage_path}"

    async def ensure_local_file(self, storage_path: str) -> Path:
        local_path = (STORAGE_LOCAL_DIR / storage_path).resolve()
        if STORAGE_LOCAL_DIR.resolve() not in local_path.parents:
            raise ValueError("Invalid storage path")
        if local_path.exists():
            return local_path
        if not (self.supabase_url and self.service_role_key and "your-project" not in self.supabase_url):
            return local_path

        download_url = f"{self.supabase_url}/storage/v1/object/{self.bucket}/{storage_path}"
        headers = {"Authorization": f"Bearer {self.service_role_key}"}
        async with httpx.AsyncClient() as client:
            response = await client.get(download_url, headers=headers)
            response.raise_for_status()
        local_path.parent.mkdir(parents=True, exist_ok=True)
        local_path.write_bytes(response.content)
        return local_path

    async def delete_file(self, storage_path: str) -> bool:
        if self.supabase_url and self.service_role_key and "your-project" not in self.supabase_url:
            delete_url = f"{self.supabase_url}/storage/v1/object/{self.bucket}/{storage_path}"
            headers = {"Authorization": f"Bearer {self.service_role_key}"}
            try:
                async with httpx.AsyncClient() as client:
                    await client.delete(delete_url, headers=headers)
            except Exception as e:
                logger.warning(f"Error deleting from Supabase storage: {e}")

        local_path = STORAGE_LOCAL_DIR / storage_path
        if local_path.exists():
            local_path.unlink()
        return True


storage_service = StorageService()
