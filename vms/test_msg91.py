import asyncio
import httpx

async def main():
    authkey = "497972AyIheIaW69a8063fP1"
    url = "https://control.msg91.com/api/v5/otp"

    # With JSON:
    client = httpx.AsyncClient()
    res1 = await client.post(url, headers={"authkey": authkey}, json={"mobile": "919618542274", "otp": "9999"})
    print("JSON body response:", res1.json())
    
    # With query params:
    res2 = await client.post(url, headers={"authkey": authkey}, params={"template_id": "", "mobile": "919618542274", "otp": "8888"})
    print("Query params response:", res2.json())
    
    await client.aclose()

asyncio.run(main())
