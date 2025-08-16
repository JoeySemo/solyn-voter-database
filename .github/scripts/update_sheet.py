import os
import json
import subprocess
from google.oauth2 import service_account
from googleapiclient.discovery import build

# Load Google service account credentials
creds = service_account.Credentials.from_service_account_info(
    json.loads(os.environ['GOOGLE_CREDENTIALS']),
    scopes=["https://www.googleapis.com/auth/spreadsheets"]
)

sheet_id = os.environ['GOOGLE_SHEET_ID']
range_name = "Sheet1!A1"  # You can change this to your desired range

# Gather commit information
commit_hash = subprocess.getoutput("git rev-parse HEAD")
commit_message = subprocess.getoutput("git log -1 --pretty=%B")
author_email = subprocess.getoutput("git log -1 --pretty=%ae")
timestamp = subprocess.getoutput("git log -1 --pretty=%cI")

values = [[commit_hash, commit_message, author_email, timestamp]]

service = build('sheets', 'v4', credentials=creds)
body = {"values": values}
result = service.spreadsheets().values().append(
    spreadsheetId=sheet_id,
    range=range_name,
    valueInputOption="RAW",
    body=body
).execute()

print("Row appended:", result)
