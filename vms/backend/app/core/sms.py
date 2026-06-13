import httpx
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# MSG91 API Configuration
MSG91_AUTH_KEY = os.getenv("MSG91_AUTH_KEY")
MSG91_BASE_URL = "https://control.msg91.com/api/v5"
# Default template ID — you can create one in MSG91 dashboard
# The template must contain a placeholder like ##OTP## for the OTP value
MSG91_TEMPLATE_ID = os.getenv("MSG91_TEMPLATE_ID", "")


async def send_otp(phone_number: str, otp: str) -> bool:
    """
    Sends an OTP to the given phone number via MSG91.
    Uses the Send OTP API which auto-generates and sends the OTP.
    We pass our own OTP value via the 'otp' param.
    """
    if not MSG91_AUTH_KEY:
        logger.warning(f"MSG91 Auth Key not configured. Mocking OTP send: {otp} to {phone_number}")
        print(f"\n[MOCK SMS - MSG91] To: {phone_number} | OTP: {otp}\n")
        return True

    # MSG91 expects phone number with country code but no + prefix
    clean_number = phone_number.replace("+", "").strip()
    
    # If standard 10 digit Indian number, assume India prefix
    if len(clean_number) == 10:
        clean_number = f"91{clean_number}"

    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "authkey": MSG91_AUTH_KEY,
                "Content-Type": "application/json",
            }

            payload = {
                "mobile": clean_number,
                "otp": otp,
            }

            # Add template ID if configured
            if MSG91_TEMPLATE_ID:
                payload["template_id"] = MSG91_TEMPLATE_ID

            response = await client.post(
                f"{MSG91_BASE_URL}/otp",
                json=payload,
                headers=headers,
                timeout=15.0,
            )

            data = response.json()
            msg_type = data.get("type")

            if response.status_code == 200 and msg_type == "success":
                logger.info(f"OTP sent to {phone_number} via MSG91")
                return True
            else:
                logger.error(f"MSG91 OTP failed: {response.text}")
                return False

    except Exception as e:
        logger.error(f"Error sending OTP via MSG91: {str(e)}")
        return False


async def verify_otp_msg91(phone_number: str, otp: str) -> bool:
    """
    Verify OTP via MSG91's verification API (optional — can use local DB check instead).
    """
    if not MSG91_AUTH_KEY:
        return False  # Use local DB verification when MSG91 is not configured

    clean_number = phone_number.replace("+", "").strip()

    try:
        async with httpx.AsyncClient() as client:
            params = {
                "authkey": MSG91_AUTH_KEY,
                "mobile": clean_number,
                "otp": otp,
            }

            response = await client.get(
                f"{MSG91_BASE_URL}/otp/verify",
                params=params,
                timeout=15.0,
            )

            data = response.json()
            if data.get("type") == "success":
                logger.info(f"OTP verified for {phone_number} via MSG91")
                return True
            else:
                logger.warning(f"MSG91 OTP verify failed: {response.text}")
                return False

    except Exception as e:
        logger.error(f"Error verifying OTP via MSG91: {str(e)}")
        return False


async def resend_otp(phone_number: str, retrytype: str = "text") -> bool:
    """
    Resend OTP via MSG91.
    retrytype: 'text' for SMS, 'voice' for voice call
    """
    if not MSG91_AUTH_KEY:
        logger.warning(f"MSG91 Auth Key not configured. Cannot resend OTP to {phone_number}")
        return False

    clean_number = phone_number.replace("+", "").strip()

    try:
        async with httpx.AsyncClient() as client:
            headers = {"authkey": MSG91_AUTH_KEY}
            params = {
                "mobile": clean_number,
                "retrytype": retrytype,
            }

            response = await client.post(
                f"{MSG91_BASE_URL}/otp/retry",
                params=params,
                headers=headers,
                timeout=15.0,
            )

            data = response.json()
            if data.get("type") == "success":
                logger.info(f"OTP resent to {phone_number} via MSG91")
                return True
            else:
                logger.error(f"MSG91 resend failed: {response.text}")
                return False

    except Exception as e:
        logger.error(f"Error resending OTP via MSG91: {str(e)}")
        return False
