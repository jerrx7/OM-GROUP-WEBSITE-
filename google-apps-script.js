/**
 * GOOGLE APPS SCRIPT BACKEND — OM GROUP "REQUEST A QUOTE" FORM
 *
 * SETUP / REDEPLOY INSTRUCTIONS:
 * 1. Open the Google Sheet (ID: 1uG2uvgIAcUFuxnBjMtvbxK8iLQW82rmCqz6l4MMK-0s)
 * 2. Extensions → Apps Script
 * 3. Replace ALL existing code with this file's contents.
 * 4. Save (Ctrl+S).
 * 5. Deploy → Manage deployments → Edit → New version → Deploy
 * 6. Settings: Execute as = Me | Who has access = Anyone
 * 7. Authorise when prompted: Advanced → Go to project (unsafe) → Allow
 */

// ─── CONFIGURATION ────────────────────────────────────────────────────────────
var SPREADSHEET_ID = "1uG2uvgIAcUFuxnBjMtvbxK8iLQW82rmCqz6l4MMK-0s";
var SHEET_NAME     = "OM GROUP WEBSITE LEADS";
var NOTIFY_EMAIL   = "omgroup.support@gmail.com";
// ──────────────────────────────────────────────────────────────────────────────


function doPost(e) {
  // Guard: Apps Script editor Run button passes no arguments — e will be undefined.
  // This function only works when triggered via HTTP POST from the website form.
  if (!e) {
    Logger.log("[doPost] Called without event object — use the website form to test, not the Run button.");
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: "No event — submit the form from the website to test." }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);

    // ── 1. Parse incoming payload ─────────────────────────────────────────────
    var payload;
    if (e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
        Logger.log("[doPost] Payload type: JSON");
      } catch (_) {
        payload = e.parameter;
        Logger.log("[doPost] Payload type: URL-encoded");
      }
    } else {
      payload = e.parameter;
      Logger.log("[doPost] Payload type: e.parameter fallback");
    }
    Logger.log("[doPost] Raw payload: " + JSON.stringify(payload));

    // ── 2. Open spreadsheet ───────────────────────────────────────────────────
    var spreadsheet;
    try {
      spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      Logger.log("[doPost] Spreadsheet opened: '" + spreadsheet.getName() + "' (ID: " + SPREADSHEET_ID + ")");
    } catch (openErr) {
      Logger.log("[doPost] FATAL: Cannot open spreadsheet — " + openErr.toString());
      throw openErr;
    }

    // ── 3. Select sheet — by name first, fall back to first sheet ─────────────
    var sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (sheet) {
      Logger.log("[doPost] Sheet found by name: '" + SHEET_NAME + "'");
    } else {
      var allTabs = spreadsheet.getSheets().map(function(s) { return "'" + s.getName() + "'"; });
      Logger.log("[doPost] Sheet '" + SHEET_NAME + "' NOT found. Available tabs: " + allTabs.join(", "));
      Logger.log("[doPost] Falling back to first sheet (index 0).");
      sheet = spreadsheet.getSheets()[0];
      Logger.log("[doPost] Using sheet: '" + sheet.getName() + "'");
    }

    Logger.log("[doPost] Sheet tab name in use: '" + sheet.getName() + "'");
    Logger.log("[doPost] Current row count (before write): " + sheet.getLastRow());

    // ── 4. Add headers if sheet is empty ──────────────────────────────────────
    if (sheet.getLastRow() === 0) {
      Logger.log("[doPost] Sheet is empty — adding header row.");
      var headers = ["DATE","NAME","COMPANY","PHONE","EMAIL",
                     "PRODUCT CATEGORY","PRODUCT SUB-CATEGORY",
                     "QUANTITY","UNIT OF MEASURE","PROJECT LOCATION","MESSAGE"];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#FAF8F3");
      Logger.log("[doPost] Headers written.");
    }

    // ── 5. Extract field values ───────────────────────────────────────────────
    var timestamp          = payload.timestamp          || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    var fullName           = payload.fullName           || "";
    var companyName        = payload.companyName        || "";
    var mobileNumber       = payload.mobileNumber       || "";
    var emailAddress       = payload.emailAddress       || "";
    var productCategory    = payload.productCategory    || "";
    var productSubcategory = payload.productSubcategory || "";
    var quantity           = payload.quantity           || "";
    var unitOfMeasure      = payload.unitOfMeasure      || "";
    var projectLocation    = payload.projectLocation    || "";
    var message            = payload.message            || "";

    Logger.log("[doPost] Fields extracted — Name: '" + fullName + "', Email: '" + emailAddress + "', Phone: '" + mobileNumber + "'");

    // ── 6. Server-side validation ─────────────────────────────────────────────
    if (!fullName || !mobileNumber || !emailAddress || !quantity || !unitOfMeasure) {
      Logger.log("[doPost] Validation FAILED. fullName='" + fullName + "' mobileNumber='" + mobileNumber + "' emailAddress='" + emailAddress + "' quantity='" + quantity + "' unitOfMeasure='" + unitOfMeasure + "'");
      lock.releaseLock();
      return ContentService
        .createTextOutput(JSON.stringify({ status: "error", message: "Missing required fields." }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    Logger.log("[doPost] Validation passed.");

    // ── 7. Write row to Google Sheet ──────────────────────────────────────────
    var rowData = [
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
    ];

    Logger.log("[doPost] About to call appendRow() on sheet '" + sheet.getName() + "'");
    Logger.log("[doPost] Row data: " + JSON.stringify(rowData));

    try {
      sheet.appendRow(rowData);
      var newLastRow = sheet.getLastRow();
      Logger.log("[doPost] appendRow() SUCCESS. New last row: " + newLastRow);
      Logger.log("[doPost] Row written at row number: " + newLastRow);
    } catch (writeErr) {
      Logger.log("[doPost] appendRow() FAILED: " + writeErr.toString());
      throw writeErr;
    }

    // ── 8. Send email notification ────────────────────────────────────────────
    try {
      sendNotificationEmail({
        timestamp: timestamp, fullName: fullName, companyName: companyName,
        mobileNumber: mobileNumber, emailAddress: emailAddress,
        productCategory: productCategory, productSubcategory: productSubcategory,
        quantity: quantity, unitOfMeasure: unitOfMeasure,
        projectLocation: projectLocation, message: message
      });
      Logger.log("[doPost] Email sent to " + NOTIFY_EMAIL);
    } catch (emailErr) {
      Logger.log("[doPost] Email FAILED (row already saved): " + emailErr.toString());
    }

    lock.releaseLock();
    Logger.log("[doPost] COMPLETE. Lock released.");

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", message: "Lead saved successfully." }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("[doPost] UNHANDLED ERROR: " + error.toString());
    if (lock.hasLock()) lock.releaseLock();
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


function doOptions(_e) {
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT);
}


function sendNotificationEmail(details) {
  var subject  = "New Request for Quote — OM Group Website";
  var htmlBody = "<div style=\"font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-top:4px solid #F15A29;\">"
    + "<h2 style=\"color:#1E2A47;border-bottom:1px solid #F15A29;padding-bottom:10px;margin-top:0;\">New Request for Quote</h2>"
    + "<p style=\"color:#6B6B6B;font-size:14px;\">A new quote request has been submitted from the OM Group website.</p>"
    + "<table style=\"width:100%;border-collapse:collapse;margin-top:20px;\">"
    + row("DATE",                 details.timestamp,                                                                                          true)
    + row("NAME",                 "<strong>" + details.fullName + "</strong>",                                                                false)
    + row("COMPANY",              details.companyName        || "Not Provided",                                                               true)
    + row("PHONE",                details.mobileNumber,                                                                                       false)
    + row("EMAIL",                "<a href=\"mailto:" + details.emailAddress + "\" style=\"color:#F15A29;\">" + details.emailAddress + "</a>", true)
    + row("PRODUCT CATEGORY",     "<strong>" + (details.productCategory    || "Not Selected") + "</strong>",                                  false)
    + row("PRODUCT SUB-CATEGORY", details.productSubcategory || "Not Selected",                                                               true)
    + row("QUANTITY",             "<strong>" + details.quantity + " " + details.unitOfMeasure + "</strong>",                                  false)
    + row("PROJECT LOCATION",     details.projectLocation    || "Not Provided",                                                               true)
    + row("MESSAGE",              details.message            || "—",                                                                          false)
    + "</table>"
    + "<p style=\"margin-top:30px;font-size:12px;color:#8E8E8E;text-align:center;border-top:1px solid #eeeeee;padding-top:15px;\">Auto-generated by OM Group Website</p>"
    + "</div>";

  MailApp.sendEmail({ to: NOTIFY_EMAIL, subject: subject, htmlBody: htmlBody });
}

function row(label, value, stripe) {
  var bg = stripe ? "background-color:#FAF8F3;" : "";
  return "<tr style=\"" + bg + "\">"
    + "<td style=\"padding:10px;border:1px solid #eee;font-weight:bold;width:38%;color:#6B6B6B;\">" + label + "</td>"
    + "<td style=\"padding:10px;border:1px solid #eee;color:#141416;\">" + value + "</td>"
    + "</tr>";
}