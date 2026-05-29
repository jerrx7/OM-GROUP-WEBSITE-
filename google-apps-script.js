/**
 * GOOGLE APPS SCRIPT BACKEND FOR OM GROUP REQUEST A QUOTE FORM
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a Google Sheet named "OM Group Website Leads" at https://sheets.google.com
 * 2. Rename the first tab/sheet to "OM Group Website Leads"
 * 3. In the Google Sheet, go to the top menu: Extensions -> Apps Script
 * 4. Delete any existing code in the Apps Script editor.
 * 5. Copy the entire contents of this file (excluding these instructions if you wish) and paste it into the editor.
 * 6. Save the project (click the diskette icon).
 * 7. Click the "Deploy" button at the top right, and select "New deployment".
 * 8. Select "Web app" as the deployment type (click the gear icon if "Web app" is not visible).
 * 9. Configure the deployment settings:
 *    - Description: OM Group Lead Submission API
 *    - Execute as: Me (your-gmail-address)
 *    - Who has access: Anyone (required to allow public form submissions)
 * 10. Click "Deploy".
 * 11. Google will prompt you to authorize permissions. Click "Authorize access", choose your account,
 *     click "Advanced" (bottom left of modal), click "Go to Untitled project (unsafe)" (or your script name),
 *     and click "Allow".
 * 12. Copy the generated "Web app URL" (it will look like: https://script.google.com/macros/s/XXXXX/exec).
 * 13. Paste this URL into index.html and OM Group Landing.html, replacing the placeholder "[[GOOGLE_APPS_SCRIPT_WEBAPP_URL]]" around the end of the file.
 * 
 * THAT'S IT! The database, emails, and notifications are now fully linked.
 */

// Handle POST requests from the website form
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Acquire lock for 10 seconds to handle concurrent writes safely
    lock.waitLock(10000);
    
    var payload;
    // Handle both JSON and URL-encoded posts
    if (e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (err) {
        payload = e.parameter;
      }
    } else {
      payload = e.parameter;
    }
    
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getSheetByName("OM Group Website Leads");
    if (!sheet) {
      sheet = doc.insertSheet("OM Group Website Leads");
      var headers = [
        "Date & Time",
        "Full Name",
        "Company Name",
        "Mobile Number",
        "Email Address",
        "Product Category",
        "Product Subcategory",
        "Quantity",
        "Unit of Measure",
        "Project Location",
        "Message"
      ];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#FAF8F3");
    }
    
    var timestamp = payload.timestamp || new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    var fullName = payload.fullName || "";
    var companyName = payload.companyName || "";
    var mobileNumber = payload.mobileNumber || "";
    var emailAddress = payload.emailAddress || "";
    var productCategory = payload.productCategory || "";
    var productSubcategory = payload.productSubcategory || "";
    var quantity = payload.quantity || "";
    var unitOfMeasure = payload.unitOfMeasure || "";
    var projectLocation = payload.projectLocation || "";
    var message = payload.message || "";
    
    // Server-side validation
    if (!fullName || !mobileNumber || !emailAddress || !quantity || !unitOfMeasure) {
      return ContentService.createTextOutput(JSON.stringify({
        "status": "error",
        "message": "Missing required fields."
      }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
    }
    
    // Write row to Google Sheet
    sheet.appendRow([
      timestamp,
      fullName,
      companyName,
      mobileNumber,
      emailAddress,
      productCategory,
      productSubcategory,
      quantity,
      unitOfMeasure,
      projectLocation,
      message
    ]);
    
    // Send email notification to: omgroup.support@gmail.com
    sendNotificationEmail({
      timestamp: timestamp,
      fullName: fullName,
      companyName: companyName,
      mobileNumber: mobileNumber,
      emailAddress: emailAddress,
      productCategory: productCategory,
      productSubcategory: productSubcategory,
      quantity: quantity,
      unitOfMeasure: unitOfMeasure,
      projectLocation: projectLocation,
      message: message
    });
    
    // Release the script lock
    lock.releaseLock();
    
    return ContentService.createTextOutput(JSON.stringify({
      "status": "success",
      "message": "Lead saved successfully."
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*");
    
  } catch (error) {
    if (lock.hasLock()) lock.releaseLock();
    return ContentService.createTextOutput(JSON.stringify({
      "status": "error",
      "message": error.toString()
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*");
  }
}

// Handle OPTIONS request for CORS preflight (if needed)
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// Send email notification to support inbox
function sendNotificationEmail(details) {
  var recipient = "omgroup.support@gmail.com";
  var subject = "New Request for Quote - OM Group Website";
  
  var htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-top: 4px solid #F15A29;">
      <h2 style="color: #1E2A47; border-bottom: 1px solid #F15A29; padding-bottom: 10px; margin-top: 0;">New Request for Quote</h2>
      <p style="color: #6B6B6B; font-size: 14px;">A new quote request has been submitted from the OM Group website. Here are the details:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <tr style="background-color: #FAF8F3;">
          <td style="padding: 10px; border: 1px solid #eeeeee; font-weight: bold; width: 40%; color: #6B6B6B;">Date & Time</td>
          <td style="padding: 10px; border: 1px solid #eeeeee; color: #141416;">${details.timestamp}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #eeeeee; font-weight: bold; color: #6B6B6B;">Full Name</td>
          <td style="padding: 10px; border: 1px solid #eeeeee; color: #141416; font-size: 15px; font-weight: bold;">${details.fullName}</td>
        </tr>
        <tr style="background-color: #FAF8F3;">
          <td style="padding: 10px; border: 1px solid #eeeeee; font-weight: bold; color: #6B6B6B;">Company Name</td>
          <td style="padding: 10px; border: 1px solid #eeeeee; color: #141416;">${details.companyName || 'Not Provided'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #eeeeee; font-weight: bold; color: #6B6B6B;">Mobile Number</td>
          <td style="padding: 10px; border: 1px solid #eeeeee; color: #141416;">${details.mobileNumber}</td>
        </tr>
        <tr style="background-color: #FAF8F3;">
          <td style="padding: 10px; border: 1px solid #eeeeee; font-weight: bold; color: #6B6B6B;">Email Address</td>
          <td style="padding: 10px; border: 1px solid #eeeeee; color: #141416;"><a href="mailto:${details.emailAddress}" style="color: #F15A29; text-decoration: none;">${details.emailAddress}</a></td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #eeeeee; font-weight: bold; color: #6B6B6B;">Product Category</td>
          <td style="padding: 10px; border: 1px solid #eeeeee; color: #141416; font-weight: bold;">${details.productCategory || 'Not Selected'}</td>
        </tr>
        <tr style="background-color: #FAF8F3;">
          <td style="padding: 10px; border: 1px solid #eeeeee; font-weight: bold; color: #6B6B6B;">Product Subcategory</td>
          <td style="padding: 10px; border: 1px solid #eeeeee; color: #141416;">${details.productSubcategory || 'Not Selected'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #eeeeee; font-weight: bold; color: #6B6B6B;">Quantity</td>
          <td style="padding: 10px; border: 1px solid #eeeeee; color: #141416; font-weight: bold;">${details.quantity} ${details.unitOfMeasure}</td>
        </tr>
        <tr style="background-color: #FAF8F3;">
          <td style="padding: 10px; border: 1px solid #eeeeee; font-weight: bold; color: #6B6B6B;">Project Location</td>
          <td style="padding: 10px; border: 1px solid #eeeeee; color: #141416;">${details.projectLocation || 'Not Provided'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #eeeeee; font-weight: bold; color: #6B6B6B; vertical-align: top;">Message</td>
          <td style="padding: 10px; border: 1px solid #eeeeee; color: #141416; white-space: pre-wrap;">${details.message || 'No Message'}</td>
        </tr>
      </table>
      
      <p style="margin-top: 30px; font-size: 12px; color: #8E8E8E; text-align: center; border-top: 1px solid #eeeeee; padding-top: 15px;">
        This email was automatically generated from the OM Group Website.
      </p>
    </div>
  `;
  
  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    htmlBody: htmlBody
  });
}
