import httpx
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Fast2SMS API Configuration
FAST2SMS_API_KEY = os.getenv("FAST2SMS_API_KEY")
FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2"

async def send_sms_otp(phone_number: str, otp: str) -> bool:
    """
    Sends an OTP to the given phone number via Fast2SMS.
    """
    # If no API configured, fallback to console log (mock mode)
    if not FAST2SMS_API_KEY:
        logger.warning(f"Fast2SMS API Key not configured. Mocking OTP send: {otp} to {phone_number}")
        print(f"\n[MOCK SMS - Fast2SMS] To: {phone_number} | OTP: {otp}\n")
        return True

    # Fast2SMS uses route 'otp' for sending variables like OTP
    # Note: Ensure the phone number is 10 digits without prefix for Fast2SMS in India
    clean_number = phone_number.replace("+91", "").replace("+", "").strip()
    
    try:
        async with httpx.AsyncClient() as client:
            # Fast2SMS API parameter structure for OTP route
            params = {
                "authorization": FAST2SMS_API_KEY,
                "variables_values": otp,
                "route": "otp",
                "numbers": clean_number
            }
            
            response = await client.get(
                FAST2SMS_URL,
                params=params,
                timeout=10.0
            )
            
            data = response.json()
            if response.status_code == 200 and data.get("return"):
                logger.info(f"OTP successfully sent to {phone_number} via Fast2SMS")
                return True
            else:
                logger.error(f"Failed to send Fast2SMS OTP: {response.text}")
                return False
                
    except Exception as e:
        logger.error(f"Error during Fast2SMS OTP delivery: {str(e)}")
        return False
