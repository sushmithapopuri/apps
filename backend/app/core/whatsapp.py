import httpx
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# WhatsApp API Configuration (e.g. for Evolution API, UltraMsg, or a generic gateway)
WHATSAPP_API_URL = os.getenv("WHATSAPP_API_URL")
WHATSAPP_API_KEY = os.getenv("WHATSAPP_API_KEY")
WHATSAPP_INSTANCE_ID = os.getenv("WHATSAPP_INSTANCE_ID")

async def send_whatsapp_otp(phone_number: str, otp: str) -> bool:
    """
    Sends an OTP to the given phone number via WhatsApp.
    Currently implements a generic REST API call structure.
    """
    # If no API configured, fallback to console log (mock mode)
    if not WHATSAPP_API_URL or not WHATSAPP_API_KEY:
        logger.warning(f"WhatsApp API not configured. Mocking OTP send: {otp} to {phone_number}")
        print(f"\n[MOCK WHATSAPP] To: {phone_number} | Message: Your VMS verification code is {otp}\n")
        return True

    message = f"Your Visitor Management System verification code is: {otp}. It expires in 5 minutes."
    
    try:
        # Example for a common WhatsApp gateway (e.g. UltraMsg or Evolution API)
        # We use a POST request with the expected structure
        async with httpx.AsyncClient() as client:
            payload = {
                "token": WHATSAPP_API_KEY,
                "to": phone_number.replace("+", ""), # some APIs don't like + prefix
                "body": message
            }
            
            # Note: Adjust fields/URL structure based on your specific provider
            # This is a template for services like UltraMsg
            response = await client.post(
                WHATSAPP_API_URL,
                json=payload,
                timeout=10.0
            )
            
            if response.status_code in [200, 201]:
                logger.info(f"OTP successfully sent to {phone_number} via WhatsApp")
                return True
            else:
                logger.error(f"Failed to send WhatsApp OTP: {response.text}")
                return False
                
    except Exception as e:
        logger.error(f"Error during WhatsApp OTP delivery: {str(e)}")
        return False
