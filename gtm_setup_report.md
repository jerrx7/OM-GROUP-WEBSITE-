# Google Tag Manager & Google Ads Conversion Tracking Report

This report details the audit, verification, and configuration of Google Tag Manager (GTM) and Google Ads Conversion Tracking for `www.omgroupco.com`. It provides a structured list of configured components and a step-by-step guide for importing the tracking setup directly into the GTM Workspace.

---

## 1. GTM Installation Verification

### Current Status
- **GTM Snippet Status**: Successfully implemented site-wide on the active pages of the website (`index.html` and `thank-you.html`).
  - GTM Script Container loaded immediately after the opening `<head>` tag.
  - GTM Noscript Iframe loaded immediately after the opening `<body>` tag.
- **Container ID**: Verified as `GTM-KPTCD4S2`.
- **Data Layer**: Active and correctly initialized upon GTM initialization.
- **Errors**: No JavaScript execution or GTM load errors were found during testing.

---

## 2. Lead Generation Flow Audit

We audited the website and identified the active lead-generation entry points and click actions:

| Lead Action | Element / Form ID | Modal ID | Successful Action Behavior | Recommended Trigger |
| :--- | :--- | :--- | :--- | :--- |
| **Request Quote** | `<form id="quoteForm">` | `#quoteModal` | Performs AJAX POST request and redirects to `/thank-you.html`. | Page View: Page Path equals `/thank-you.html` |
| **Careers / Join Us** | `<form id="careersForm">` | `#careersModal` | Performs AJAX POST, stays on page, hides form, and displays `#careersSuccessMessage`. | Form Submission: Form ID equals `careersForm` (or Visibility of `#careersSuccessMessage`) |
| **Email Inquiry** | `href="mailto:hello@omgroupgoa.in"` | N/A | Opens user's default email client. | Link Click: Click URL starts with `mailto:` |
| **Phone Call** | Text: `+91-9049629684` / `+91-8788732881` | N/A | None (Static Text, not clickable). | Link Click: Click URL starts with `tel:` *(Requires link element modification)* |
| **WhatsApp Inquiry** | N/A (Currently not on site) | N/A | None. | Link Click: Click URL contains `wa.me` |

---

## 3. Conversion Tracking Architecture

The following tags, triggers, variables, and folders have been pre-configured inside [gtm_container_setup.json](file:///c:/Users/Shyam%20Tiwari/Downloads/OMGROUPCO/gtm_container_setup.json) for a clean workspace structure:

### A. Folders (`GTM Folder Structure`)
- `Core Configuration`: Holds global scripts and setup tags.
- `Google Ads Tracking`: Holds conversion tracking tags.
- `Form Submission Tracking`: Holds form-specific triggers and configurations.
- `Click Tracking`: Holds click-based triggers.

### B. Tags (`GTM Tag Configuration`)
1. **`GT - Core Setup`**: Google Tag (gtag) template initialized with `{{Google Ads Conversion ID}}`, firing on **All Pages**.
2. **`Google Ads - Conversion Linker`**: Enables first-party cookies to capture conversions on safari and modern browsers, firing on **All Pages**.
3. **`Google Ads - Conversion - Request Quote`**: Google Ads tracking tag, firing on `/thank-you.html` Page View.
4. **`Google Ads - Conversion - Careers Form`**: Google Ads tracking tag, firing on `careersForm` Form Submission.
5. **`Google Ads - Conversion - WhatsApp Click`**: Google Ads tracking tag, firing on link clicks containing `wa.me`.
6. **`Google Ads - Conversion - Phone Click`**: Google Ads tracking tag, firing on link clicks starting with `tel:`.
7. **`Google Ads - Conversion - Email Click`**: Google Ads tracking tag, firing on link clicks starting with `mailto:`.

### C. Triggers
- **`Trigger - Page View - Thank You Page`**: Page View, matches `Page Path` equals `/thank-you.html`.
- **`Trigger - Form Submission - Careers Form`**: Form Submission, matches `Form ID` equals `careersForm`.
- **`Trigger - Link Click - WhatsApp`**: Link Click (Just Links), matches `Click URL` contains `wa.me`.
- **`Trigger - Link Click - Phone`**: Link Click (Just Links), matches `Click URL` starts with `tel:`.
- **`Trigger - Link Click - Email`**: Link Click (Just Links), matches `Click URL` starts with `mailto:`.

### D. Variables
- **`Google Ads Conversion ID`** (Constant): Contains the global Google Ads ID (Placeholder: `AW-123456789`).
- **`Label - Request Quote`** (Constant): Placeholder for the Google Ads Conversion Label.
- **`Label - Careers Form`** (Constant): Placeholder.
- **`Label - WhatsApp Click`** (Constant): Placeholder.
- **`Label - Phone Click`** (Constant): Placeholder.
- **`Label - Email Click`** (Constant): Placeholder.
- *Built-in variables enabled*: `Page Path`, `Click URL`, `Form ID`.

---

## 4. Issues Found & Recommendations

### Issue 1: Phone Numbers are Static Text
- **Observation**: The contact section lists phone numbers (`+91-9049629684` and `+91-8788732881`) as static copy rather than active link elements. Users on mobile devices cannot click them to dial, and GTM cannot track phone number link clicks.
- **Recommendation**: Wrap them in clickable links inside `index.html` like this (without altering visual design/CSS):
  ```html
  <a href="tel:+919049629684">+91-9049629684</a>
  <a href="tel:+918788732881">+91-8788732881</a>
  ```

### Issue 2: No WhatsApp Direct Link
- **Observation**: There is no direct WhatsApp click action available on the website, which is a major conversion source for Indian markets.
- **Recommendation**: Add a WhatsApp CTA button in the contact section or a floating button pointing to `https://wa.me/919049629684` to facilitate quick leads.

### Issue 3: Duplicate Form Submissions
- **Observation**: Default GTM Form Submission triggers can sometimes fire twice or capture failed validation attempts.
- **Recommendation**:
  - For the **Request Quote** form, tracking via `/thank-you.html` Page View is completely immune to validation failures (as the page only loads after a successful backend AJAX resolution). This is configured in GTM as the primary trigger.
  - For the **Careers** form, utilizing a Data Layer push `window.dataLayer.push({'event': 'careers_submit_success'});` embedded directly into the successful AJAX `.then()` block is more robust than a generic Form Submission trigger.

---

## 5. Step-by-Step GTM Import Guide

To apply the pre-configured tracking structure directly to GTM:

1. **Download the GTM Setup File**: Located locally at [gtm_container_setup.json](file:///c:/Users/Shyam%20Tiwari/Downloads/OMGROUPCO/gtm_container_setup.json).
2. **Access GTM**: Go to [tagmanager.google.com](https://tagmanager.google.com) and open container `GTM-KPTCD4S2`.
3. **Navigate to Admin**: Click the **Admin** tab at the top.
4. **Select Import Container**: Under the Container options column, click **Import Container**.
5. **Upload Setup File**: Choose `gtm_container_setup.json`.
6. **Select Workspace**: Choose **Existing** (e.g. Default Workspace) or create a new workspace (e.g., "Google Ads Setup").
7. **Choose Import Option**: Select **Merge** and then **Rename conflicting tags/triggers/variables** (to prevent overwriting any custom tags already in your workspace).
8. **Verify and Update Variables**:
   - Go to **Variables** inside GTM.
   - Open `Google Ads Conversion ID` and change the value to your active Google Ads Conversion ID (format `AW-XXXXXXXXXX`).
   - Open each conversion label variable (e.g. `Label - Request Quote`) and input the unique conversion label provided by your Google Ads account.
9. **Preview & Publish**: Click **Preview** to verify the tags fire correctly via Tag Assistant, then click **Submit** to publish the changes live.
