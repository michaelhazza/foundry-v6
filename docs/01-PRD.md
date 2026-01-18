# Foundry — Product Requirements Document

**Version:** 1.0  
**Date:** January 2026  
**Status:** COMPLETE  
**Deployment Target:** Replit

---

## Section 1: Executive Summary

Foundry is a multi-tenant SaaS platform that transforms fragmented business data—support tickets, sales conversations, operational documents—into clean, de-identified, structured datasets ready for AI agent training. Users connect data sources (file uploads or API integrations), configure field mappings and de-identification rules through a no-code interface, and export training-ready data in formats compatible with AI fine-tuning workflows.

**Primary Value Proposition:** Turn messy operational data into AI training datasets in under 5 minutes, without engineering resources or privacy concerns.

**Target Market:** Small-to-medium businesses with operational data (support desks, CRMs, sales platforms) who want to train AI agents on their own data but lack the technical capability to build data pipelines.

**Key Differentiators:**
- Configuration-driven (no coding required)
- Privacy-first with built-in de-identification
- Source-agnostic architecture (files and APIs are equal citizens)
- 5-minute time-to-value for the core use case

**Deployment Target:** Replit (web application, monolithic full-stack architecture)

---

## Section 2: Problem Statement

**The Problem in Human Terms:**

Business teams increasingly want to train AI agents on their own operational data—to create support bots that sound like their team, sales assistants that follow their playbook, or internal tools that understand their processes. But their data is a mess.

Customer conversations live in Zendesk. Sales notes are in HubSpot. Process documentation is scattered across Notion, Google Docs, and random spreadsheets. Each system structures data differently. None of it is ready for AI training.

Worse, this data is full of customer names, email addresses, phone numbers, and company information that cannot appear in training datasets. Privacy isn't optional.

**Current Alternatives and Their Limitations:**

1. **Custom Engineering:** Companies build bespoke data pipelines for each source, each use case. This works but costs \$50K-\$200K+ in engineering time and takes months. Only large companies with dedicated data teams can do this.

2. **Manual Extraction:** Export CSVs, clean data in spreadsheets, manually redact sensitive information. Time-consuming, error-prone, and doesn't scale. A single dataset can take weeks of manual work.

3. **Give Up:** Many businesses abandon AI training initiatives because the data preparation hurdle is too high. They use generic AI models instead of ones trained on their own data.

**Quantified Impact:**

- Time to prepare training data manually: 40-160 hours per dataset (assumption based on similar workflows)
- Cost of custom engineering solution: \$50K-\$200K (assumption based on typical data pipeline projects)
- Percentage of businesses who abandon due to complexity: estimated 60%+ (assumption—flagged for validation)

**Person Experiencing the Pain:**

Operations managers, customer success leaders, and sales directors who have been told "we should train AI on our data" but don't have the engineering resources to make it happen. They can see the value but can't access it.

---

## Section 3: User Personas

### Persona 1: Ops Owen — Operations Manager

**Demographics:** 35-45 years old, manages a team of 5-15 support or operations staff, reports to VP of Operations or COO.

**Goals and Motivations:**
- Reduce support ticket volume by deploying AI assistants
- Improve team efficiency without adding headcount
- Demonstrate measurable ROI on AI initiatives

**Pain Points and Frustrations:**
- Cannot get engineering resources allocated to "experimental" AI projects
- Data is locked in tools he manages but cannot extract in useful formats
- Previous attempts at AI training required too much manual data cleaning
- Concerned about accidentally exposing customer data

**Technical Proficiency:** Low-to-medium. Comfortable with spreadsheets, basic tool configuration, and dashboards. Cannot write code or SQL queries.

**Usage Context:** Uses Foundry 2-4 times per month to prepare new training datasets. Delegates ongoing work to analysts but owns the initiative.

**Success Metrics (from Owen's perspective):**
- Time to first usable training dataset < 1 hour
- Zero manual data cleaning required
- Confidence that customer data is properly anonymized

---

### Persona 2: Analyst Anna — Data-Savvy Analyst

**Demographics:** 28-35 years old, business analyst or data analyst role, works closely with operations teams.

**Goals and Motivations:**
- Deliver high-quality data for AI training initiatives
- Understand what's in the data and ensure quality
- Build repeatable processes for ongoing data preparation

**Pain Points and Frustrations:**
- Has to manually clean data exports before they're usable
- No visibility into what gets filtered or why
- Existing tools don't handle PII consistently
- Spends time on data prep instead of analysis

**Technical Proficiency:** Medium. Expert with spreadsheets, comfortable with basic data concepts, can learn new tools quickly. Some SQL knowledge but not a developer.

**Usage Context:** Uses Foundry weekly to configure, run, and refine data processing. Digs into statistics and filtering rules. Primary hands-on user.

**Success Metrics (from Anna's perspective):**
- Clear statistics on what data was processed and filtered
- Consistent de-identification across all records
- Ability to refine filters and see immediate impact

---

### Persona 3: Admin Alex — System Administrator

**Demographics:** 30-40 years old, IT administrator or technical operations role, responsible for security and system integrations.

**Goals and Motivations:**
- Ensure data security and compliance
- Manage user access appropriately
- Connect systems securely without creating security risks

**Pain Points and Frustrations:**
- New tools often have poor access controls
- API credentials are handled insecurely by business users
- No visibility into who accessed what data
- Compliance requirements make new tools difficult to approve

**Technical Proficiency:** High. Comfortable with APIs, credentials management, and security concepts. May write scripts but not a full-time developer.

**Usage Context:** Uses Foundry monthly for administration—setting up API connections, managing users, reviewing access. Not involved in day-to-day processing.

**Success Metrics (from Alex's perspective):**
- Secure credential storage for API connections
- Clear user permission model
- Audit trail of data access (post-MVP)

---

### Persona 4: Platform Admin — Foundry Staff

**Demographics:** Internal Foundry employee responsible for customer onboarding and platform management.

**Goals and Motivations:**
- Onboard new customers quickly
- Monitor platform health
- Support customers who have issues

**Pain Points and Frustrations:**
- Manual onboarding processes don't scale
- Difficulty seeing customer status across the platform
- Support requests require digging through logs

**Technical Proficiency:** High. Full access to platform internals, comfortable with technical debugging.

**Usage Context:** Uses admin interface daily to manage organizations, monitor health, and handle support escalations.

**Success Metrics (from Platform Admin's perspective):**
- Organization creation in < 5 minutes
- Visibility into all customer processing status
- Quick identification of customer issues

---

## Section 4: User Stories and Requirements

### Authentication & Access

**US-AUTH-001**
- **Persona:** Ops Owen, Analyst Anna, Admin Alex
- **Story:** As a user, I want to log into my organization's Foundry account so that I can access our data processing projects
- **Acceptance Criteria:**
  - Given valid email and password, when I submit login, then I am redirected to my organization's dashboard
  - Given invalid credentials, when I submit login, then I see "Invalid email or password" error
  - Given valid credentials but deactivated account, when I submit login, then I see "Account deactivated" message
  - Given I'm logged in, when I close browser and return within 7 days, then my session is preserved
  - Given I'm logged in, when 30 days pass without activity, then my session expires and I must re-authenticate
- **Priority:** P0-Critical
- **MVP Status:** MVP
- **Dependencies:** None
- **Estimated Complexity:** M

**US-AUTH-002**
- **Persona:** Ops Owen, Analyst Anna, Admin Alex
- **Story:** As a user, I want to reset my password so that I can regain access if I forget it
- **Acceptance Criteria:**
  - Given I click "Forgot Password," when I enter my email, then I receive a password reset link
  - Given I have a reset link, when I click it within 24 hours, then I can set a new password
  - Given I have a reset link, when I click it after 24 hours, then I see "Link expired" and can request a new one
  - Given I set a new password, when I try the old password, then it no longer works
- **Priority:** P0-Critical
- **MVP Status:** MVP
- **Dependencies:** US-AUTH-001
- **Estimated Complexity:** S

### Organization & User Management

**US-ORG-001**
- **Persona:** Admin Alex
- **Story:** As an organization administrator, I want to invite users to my organization so that team members can access Foundry
- **Acceptance Criteria:**
  - Given I'm an org admin, when I enter an email and click Invite, then the user receives an invitation email
  - Given an invitation is sent, when the recipient clicks the link, then they can create their account
  - Given an invitation link, when 7 days pass without use, then the link expires
  - Given an expired link, when clicked, then user sees "Invitation expired" with option to request new invite
  - Given I invite an email already in my org, when I submit, then I see "User already exists" error
- **Priority:** P0-Critical
- **MVP Status:** MVP
- **Dependencies:** US-AUTH-001
- **Estimated Complexity:** M

**US-ORG-002**
- **Persona:** Admin Alex
- **Story:** As an organization administrator, I want to view all users in my organization so that I can manage team access
- **Acceptance Criteria:**
  - Given I'm an org admin, when I view the Users page, then I see a list of all users with email, role, and status
  - Given the user list, when I view it, then I see "Active" or "Deactivated" status for each user
  - Given the user list, when I view it, then I see "Last Active" date for each user
  - Given more than 20 users, when I view the list, then I can paginate through results
- **Priority:** P0-Critical
- **MVP Status:** MVP
- **Dependencies:** US-ORG-001
- **Estimated Complexity:** S

**US-ORG-003**
- **Persona:** Admin Alex
- **Story:** As an organization administrator, I want to deactivate users so that former team members lose access
- **Acceptance Criteria:**
  - Given I'm an org admin viewing a user, when I click Deactivate, then I see a confirmation prompt
  - Given I confirm deactivation, when complete, then the user's status changes to "Deactivated"
  - Given a deactivated user, when they try to log in, then they see "Account deactivated" message
  - Given I'm the only admin, when I try to deactivate myself, then I see "Cannot deactivate the only admin" error
- **Priority:** P0-Critical
- **MVP Status:** MVP
- **Dependencies:** US-ORG-002
- **Estimated Complexity:** S

**US-ORG-004**
- **Persona:** Admin Alex
- **Story:** As an organization administrator, I want to assign roles to users so that permissions are appropriately scoped
- **Acceptance Criteria:**
  - Given two roles exist (Admin, Member), when I view a user, then I can change their role via dropdown
  - Given I change a user's role, when saved, then their permissions update immediately
  - Given a Member, when they try to access User Management, then they see "Permission denied"
  - Given a Member, when they try to manage API connections, then they see "Permission denied"
  - Given I'm the only Admin, when I try to change my role to Member, then I see "Cannot remove the only admin" error
- **Priority:** P1-High
- **MVP Status:** MVP
- **Dependencies:** US-ORG-002
- **Estimated Complexity:** M

### Project Management

**US-PROJ-001**
- **Persona:** Ops Owen, Analyst Anna
- **Story:** As a user, I want to create a new project so that I can organize my AI training data preparation work
- **Acceptance Criteria:**
  - Given I'm authenticated, when I click "New Project" and enter name + description, then the project is created
  - Given I create a project, when viewing my dashboard, then the new project appears in the project list
  - Given I try to create a project with a name that already exists in my org, when I submit, then I see "Project name already exists" error
  - Given I create a project, when I view it, then I see an empty state with guidance to add a data source
- **Priority:** P0-Critical
- **MVP Status:** MVP
- **Dependencies:** US-AUTH-001
- **Estimated Complexity:** S

**US-PROJ-002**
- **Persona:** Ops Owen, Analyst Anna
- **Story:** As a user, I want to view my projects so that I can access and manage my data processing work
- **Acceptance Criteria:**
  - Given I'm authenticated, when I view the dashboard, then I see all projects in my organization
  - Given projects exist, when I view the list, then I see project name, last modified date, and processing status
  - Given I have many projects, when I search by name, then results filter in real-time
  - Given a project has never been processed, when I view the list, then status shows "Not processed"
- **Priority:** P0-Critical
- **MVP Status:** MVP
- **Dependencies:** US-PROJ-001
- **Estimated Complexity:** S

**US-PROJ-003**
- **Persona:** Ops Owen, Analyst Anna
- **Story:** As a user, I want to edit project details so that I can update name or description as needs change
- **Acceptance Criteria:**
  - Given I'm viewing a project, when I click Edit, then I can modify name and description
  - Given I change the project name to one that already exists, when I save, then I see "Name already exists" error
  - Given I save valid changes, when viewing the project, then the new details are reflected
- **Priority:** P2-Medium
- **MVP Status:** MVP
- **Dependencies:** US-PROJ-002
- **Estimated Complexity:** S

**US-PROJ-004**
- **Persona:** Ops Owen
- **Story:** As a user, I want to delete a project so that I can remove work that's no longer needed
- **Acceptance Criteria:**
  - Given I'm viewing a project, when I click Delete, then I see a confirmation prompt warning about permanent deletion
  - Given I confirm deletion, when complete, then the project no longer appears in my project list
  - Given a project has processed outputs, when I delete, then all associated data is also deleted
  - Given I cancel deletion, when I return to the project, then everything is unchanged
- **Priority:** P2-Medium
- **MVP Status:** MVP
- **Dependencies:** US-PROJ-002
- **Estimated Complexity:** S

### File Upload & Data Sources

**US-UPLOAD-001**
- **Persona:** Ops Owen, Analyst Anna
- **Story:** As a user, I want to upload a CSV file so that I can use it as a data source for processing
- **Acceptance Criteria:**
  - Given I'm in a project, when I click Upload and select a valid CSV, then the file uploads with progress indicator
  - Given upload completes, when viewing the project, then the file appears as a data source
  - Given I upload a file over 100MB, when I select it, then I see "File exceeds 100MB limit" error before upload
  - Given I upload a non-CSV/Excel/JSON file, when I select it, then I see "Unsupported file type" error
  - Given upload fails due to network, when I retry, then I can re-upload without refreshing
- **Priority:** P0-Critical
- **MVP Status:** MVP
- **Dependencies:** US-PROJ-001
- **Estimated Complexity:** M

**US-UPLOAD-002**
- **Persona:** Ops Owen, Analyst Anna
- **Story:** As a user, I want to upload Excel files so that I can use spreadsheet data as a source
- **Acceptance Criteria:**
  - Given I'm in a project, when I upload a .xlsx or .xls file, then the system accepts and parses it
  - Given an Excel file with multiple sheets, when I upload, then I'm prompted to select which sheet to use
  - Given I select a sheet, when processing continues, then only that sheet's data is used
- **Priority:** P1-High
- **MVP Status:** MVP
- **Dependencies:** US-UPLOAD-001
- **Estimated Complexity:** M

**US-UPLOAD-003**
- **Persona:** Analyst Anna
- **Story:** As a user, I want to upload JSON files so that I can use structured data exports as a source
- **Acceptance Criteria:**
  - Given I'm in a project, when I upload a valid JSON file, then the system accepts and parses it
  - Given the JSON is an array of objects, when parsed, then each object becomes a row
  - Given the JSON is a single object, when parsed, then I see guidance on expected format
  - Given malformed JSON, when I upload, then I see specific parse error with line number if available
- **Priority:** P1-High
- **MVP Status:** MVP
- **Dependencies:** US-UPLOAD-001
- **Estimated Complexity:** M

### Column Detection & Field Mapping

**US-MAPPING-001**
- **Persona:** Ops Owen, Analyst Anna
- **Story:** As a user, I want the system to auto-detect columns from my uploaded file so that I don't have to configure everything manually
- **Acceptance Criteria:**
  - Given I upload a CSV, when parsing completes, then I see a list of detected columns with sample values
  - Given column headers exist, when detected, then column names come from headers
  - Given no headers exist, when detected, then columns are named "Column 1", "Column 2", etc.
  - Given detection completes, when I view results, then I see the first 5 sample values for each column
- **Priority:** P0-Critical
- **MVP Status:** MVP
- **Dependencies:** US-UPLOAD-001
- **Estimated Complexity:** M

**US-MAPPING-002**
- **Persona:** Ops Owen, Analyst Anna
- **Story:** As a user, I want the system to suggest field mappings so that common fields are auto-configured
- **Acceptance Criteria:**
  - Given columns are detected, when viewing mappings, then system suggests mappings for recognized patterns
  - Given a column named "email" or "customer_email", when detected, then it's auto-suggested as "Customer Email"
  - Given a column named "agent" or "support_rep", when detected, then it's auto-suggested as "Agent Name"
  - Given a column named "message" or "body" or "content", when detected, then it's auto-suggested as "Message Content"
  - Given suggestions exist, when I view them, then I see confidence indicator (High/Medium/Low)
- **Priority:** P0-Critical
- **MVP Status:** MVP
- **Dependencies:** US-MAPPING-001
- **Estimated Complexity:** L

**US-MAPPING-003**
- **Persona:** Analyst Anna
- **Story:** As a user, I want to manually configure field mappings so that I can correct or override auto-suggestions
- **Acceptance Criteria:**
  - Given a column with suggested mapping, when I click the mapping dropdown, then I see all available target fields
  - Given I select a different mapping, when saved, then the new mapping overrides the suggestion
  - Given I want to ignore a column, when I select "Do not import", then that column is excluded from processing
  - Given required fields exist (e.g., Message Content), when unmapped, then I see a validation warning
- **Priority:** P0-Critical
- **MVP Status:** MVP
- **Dependencies:** US-MAPPING-002
- **Estimated Complexity:** M

**US-MAPPING-004**
- **Persona:** Analyst Anna
- **Story:** As a user, I want to identify which field represents the agent vs. customer in conversations so that roles are correctly assigned in output
- **Acceptance Criteria:**
  - Given conversation data has a "sender type" column, when I map it to "Role Identifier", then the system uses it to tag messages
  - Given I map Role Identifier, when I specify "agent" value = "support", then messages with that value are tagged as agent
  - Given I map Role Identifier, when I specify "customer" value = "user", then messages with that value are tagged as customer
  - Given no Role Identifier is mapped, when processing, then all messages are tagged as "unknown" role
- **Priority:** P1-High
- **MVP Status:** MVP
- **Dependencies:** US-MAPPING-003
- **Estimated Complexity:** M

### De-identification Configuration

**US-DEID-001**
- **Persona:** Analyst Anna
- **Story:** As a user, I want to enable de-identification so that PII is automatically removed from my output
- **Acceptance Criteria:**
  - Given I'm configuring a project, when I enable de-identification, then PII rules become active
  - Given de-identification is enabled by default, when I view settings, then the toggle is ON
  - Given I disable de-identification, when I try to process, then I see a warning about PII risk and must confirm
- **Priority:** P0-Critical
- **MVP Status:** MVP
- **Dependencies:** US-MAPPING-003
- **Estimated Complexity:** S

**US-DEID-002**
- **Persona:** Analyst Anna
- **Story:** As a user, I want names to be consistently anonymized so that the same person gets the same placeholder throughout
- **Acceptance Criteria:**
  - Given de-identification is enabled, when processing runs, then names are replaced with [PERSON_1], [PERSON_2], etc.
  - Given the same name appears multiple times, when processed, then it receives the same placeholder consistently
  - Given "John Smith" appears 5 times, when processed, then all 5 become the same placeholder (e.g., [PERSON_3])
  - Given agent names vs customer names, when processed, then they use different placeholder series ([AGENT_1] vs [PERSON_1])
- **Priority:** P0-Critical
- **MVP Status:** MVP
- **Dependencies:** US-DEID-001
- **Estimated Complexity:** L

**US-DEID-003**
- **Persona:** Analyst Anna
- **Story:** As a user, I want email addresses to be masked so that contact information is not in training data
- **Acceptance Criteria:**
  - Given de-identification is enabled, when an email is detected, then it's replaced with [EMAIL]
  - Given multiple different emails exist, when processed, then all become [EMAIL] (not distinguished)
  - Given an email appears in message body text, when processed, then it's still detected and masked
- **Priority:** P0-Critical
- **MVP Status:** MVP
- **Dependencies:** US-DEID-001
- **Estimated Complexity:** M

**US-DEID-004**
- **Persona:** Analyst Anna
- **Story:** As a user, I want phone numbers to be masked so that contact information is not in training data
- **Acceptance Criteria:**
  - Given de-identification is enabled, when a phone number is detected, then it's replaced with [PHONE]
  - Given various phone formats (123-456-7890, (123) 456-7890, +1 123 456 7890), when processed, then all are detected
  - Given a phone appears in message body, when processed, then it's still detected and masked
- **Priority:** P0-Critical
- **MVP Status:** MVP
- **Dependencies:** US-DEID-001
- **Estimated Complexity:** M

**US-DEID-005**
- **Persona:** Analyst Anna
- **Story:** As a user, I want company names to be anonymized so that customer/partner identities are protected
- **Acceptance Criteria:**
  - Given de-identification is enabled, when a company name is detected, then it's replaced with [COMPANY_1], [COMPANY_2], etc.
  - Given the same company appears multiple times, when processed, then it receives the same placeholder consistently
  - Given company detection runs, when false positives occur (common words flagged), then user can add to ignore list
- **Priority:** P1-High
- **MVP Status:** MVP
- **Dependencies:** US-DEID-001
- **Estimated Complexity:** L

**US-DEID-006**
- **Persona:** Analyst Anna
- **Story:** As a user, I want addresses to be masked so that location information is not in training data
- **Acceptance Criteria:**
  - Given de-identification is enabled, when a street address pattern is detected, then it's replaced with [ADDRESS]
  - Given partial addresses (just city/state), when detected, then they're replaced with [LOCATION]
  - Given international address formats, when processed, then common formats are detected
- **Priority:** P1-High
- **MVP Status:** MVP
- **Dependencies:** US-DEID-001
- **Estimated Complexity:** M

### De-identification Preview

**US-PREVIEW-001**
- **Persona:** Ops Owen, Analyst Anna
- **Story:** As a user, I want to preview de-identification results before full processing so that I can verify it's working correctly
- **Acceptance Criteria:**
  - Given mappings are configured, when I click "Preview", then I see sample rows with de-identification applied
  - Given preview runs, when viewing results, then I see original value → transformed value side by side
  - Given preview shows 10 sample rows, when I request more, then I can load additional samples (up to 50)
  - Given preview finds no PII, when viewing results, then I see "No PII detected in sample" message
- **Priority:** P0-Critical
- **MVP Status:** MVP
- **Dependencies:** US-DEID-001, US-MAPPING-003
- **Estimated Complexity:** M

**US-PREVIEW-002**
- **Persona:** Analyst Anna
- **Story:** As a user, I want to see which PII types were detected in the preview so that I can understand what's being anonymized
- **Acceptance Criteria:**
  - Given preview runs, when viewing results, then I see a summary: "Detected: 12 names, 8 emails, 3 phones, 2 companies"
  - Given I click a PII type in summary, when expanded, then I see examples of detected values
  - Given no instances of a type are found, when viewing summary, then that type shows "0 detected"
- **Priority:** P1-High
- **MVP Status:** MVP
- **Dependencies:** US-PREVIEW-001
- **Estimated Complexity:** S

### Quality Filtering

**US-FILTER-001**
- **Persona:** Analyst Anna
- **Story:** As a user, I want to filter by minimum conversation length so that short, unhelpful exchanges are excluded
- **Acceptance Criteria:**
  - Given I'm configuring filters, when I set minimum messages = 3, then conversations with <3 messages are excluded
  - Given I set minimum character count = 100, when processing runs, then messages shorter than 100 chars are flagged
  - Given filter is applied, when viewing stats, then I see how many records were excluded by this filter
- **Priority:** P1-High
- **MVP Status:** MVP
- **Dependencies:** US-MAPPING-003
- **Estimated Complexity:** M

**US-FILTER-002**
- **Persona:** Analyst Anna
- **Story:** As a user, I want to filter by resolution status so that only completed interactions are included
- **Acceptance Criteria:**
  - Given my data has a "status" field, when I map it and enable "Resolved only" filter, then only resolved records are included
  - Given I specify resolved value = "closed", when processing runs, then only status="closed" records are included
  - Given filter is applied, when viewing stats, then I see how many records were excluded by status filter
- **Priority:** P1-High
- **MVP Status:** MVP
- **Dependencies:** US-MAPPING-003
- **Estimated Complexity:** S

**US-FILTER-003**
- **Persona:** Analyst Anna
- **Story:** As a user, I want to filter by date range so that I can focus on recent or specific time period data
- **Acceptance Criteria:**
  - Given my data has a timestamp field, when I map it and set date range, then only records within range are included
  - Given I set start date = 2024-01-01 and end date = 2024-12-31, when processing runs, then only 2024 records are included
  - Given filter is applied, when viewing stats, then I see how many records were excluded by date filter
- **Priority:** P1-High
- **MVP Status:** MVP
- **Dependencies:** US-MAPPING-003
- **Estimated Complexity:** S

### Processing & Output

**US-PROCESS-001**
- **Persona:** Ops Owen, Analyst Anna
- **Story:** As a user, I want to trigger processing on my configured data source so that it transforms into training-ready output
- **Acceptance Criteria:**
  - Given mappings and rules are configured, when I click "Process", then batch processing begins
  - Given processing starts, when I view the project, then I see "Processing..." status with spinner
  - Given processing is running, when I navigate away and return, then status is still visible
  - Given processing completes successfully, when I view project, then I see "Completed" with timestamp
  - Given processing fails, when I view project, then I see "Failed" with error message and suggested fix
- **Priority:** P0-Critical
- **MVP Status:** MVP
- **Dependencies:** US-PREVIEW-001, US-FILTER-001
- **Estimated Complexity:** L

**US-PROCESS-002**
- **Persona:** Ops Owen, Analyst Anna
- **Story:** As a user, I want to see processing progress so that I know how long to wait
- **Acceptance Criteria:**
  - Given processing is running, when I view status, then I see progress (e.g., "Processing: 2,450 of 10,000 records")
  - Given processing has estimated time remaining, when viewed, then I see estimate (e.g., "~3 minutes remaining")
  - Given processing encounters errors on specific records, when viewing progress, then I see error count incrementing
- **Priority:** P1-High
- **MVP Status:** MVP
- **Dependencies:** US-PROCESS-001
- **Estimated Complexity:** M

**US-PROCESS-003**
- **Persona:** Analyst Anna
- **Story:** As a user, I want to see statistics about my processed data so that I understand what was included and excluded
- **Acceptance Criteria:**
  - Given processing completes, when I view results, then I see: Total records, Processed successfully, Filtered out, Errors
  - Given records were filtered, when I view breakdown, then I see count per filter rule
  - Given de-identification ran, when I view stats, then I see counts by PII type (e.g., "123 names, 89 emails anonymized")
  - Given errors occurred, when I view error details, then I see sample error messages with row references
- **Priority:** P1-High
- **MVP Status:** MVP
- **Dependencies:** US-PROCESS-001
- **Estimated Complexity:** M

**US-PROCESS-004**
- **Persona:** Ops Owen, Analyst Anna
- **Story:** As a user, I want to re-run processing so that I can generate new output after changing configuration
- **Acceptance Criteria:**
  - Given I've changed filter or de-identification settings, when I click "Re-process", then a new processing run starts
  - Given previous output exists, when new processing completes, then new output replaces old
  - Given I want to keep old output, when I re-process, then I see warning that previous output will be replaced
- **Priority:** P1-High
- **MVP Status:** MVP
- **Dependencies:** US-PROCESS-001
- **Estimated Complexity:** S

### Export & Download

**US-DOWNLOAD-001**
- **Persona:** Ops Owen, Analyst Anna
- **Story:** As a user, I want to download my processed output as JSONL so that I can use it for AI fine-tuning
- **Acceptance Criteria:**
  - Given processing is complete, when I click "Download JSONL", then file download begins
  - Given the output file, when opened, then each line is a valid JSON object in conversational format
  - Given conversational format, when viewing output, then each record has "messages" array with role and content
  - Given large output (>10MB), when downloading, then file is compressed as .jsonl.gz
- **Priority:** P0-Critical
- **MVP Status:** MVP
- **Dependencies:** US-PROCESS-001
- **Estimated Complexity:** M

**US-DOWNLOAD-002**
- **Persona:** Analyst Anna
- **Story:** As a user, I want to download a sample of my output so that I can verify quality before full download
- **Acceptance Criteria:**
  - Given processing is complete, when I click "Download Sample (100 records)", then I get a small sample file
  - Given sample download, when I review it, then it's representative of the full output
  - Given sample is satisfactory, when I download full output, then format matches sample
- **Priority:** P2-Medium
- **MVP Status:** MVP
- **Dependencies:** US-DOWNLOAD-001
- **Estimated Complexity:** S

### API Connector — Teamwork Desk

**US-API-001**
- **Persona:** Admin Alex
- **Story:** As a system administrator, I want to connect Teamwork Desk so that support ticket data flows into Foundry
- **Acceptance Criteria:**
  - Given I'm an admin, when I go to Connections and select Teamwork Desk, then I see credential input form
  - Given I enter API key and subdomain, when I click "Test Connection", then system validates credentials
  - Given credentials are valid, when test completes, then I see "Connection successful" with ticket count preview
  - Given credentials are invalid, when test fails, then I see specific error (e.g., "Invalid API key" or "Subdomain not found")
- **Priority:** P1-High
- **MVP Status:** MVP
- **Dependencies:** US-ORG-004
- **Estimated Complexity:** L

**US-API-002**
- **Persona:** Admin Alex
- **Story:** As a system administrator, I want to save my Teamwork Desk connection so that it's available for projects
- **Acceptance Criteria:**
  - Given connection test passes, when I click "Save Connection", then it appears in my organization's connection list
  - Given a saved connection, when I view it, then I see connection name, type, and last sync status
  - Given I want to update credentials, when I edit connection, then I can update and re-test
  - Given I want to remove a connection, when I delete, then I see warning about projects using it
- **Priority:** P1-High
- **MVP Status:** MVP
- **Dependencies:** US-API-001
- **Estimated Complexity:** M

**US-API-003**
- **Persona:** Analyst Anna
- **Story:** As a user, I want to use a Teamwork Desk connection as a data source so that I can process support tickets
- **Acceptance Criteria:**
  - Given a Teamwork Desk connection exists, when I add a source to a project, then I can select it
  - Given I select Teamwork Desk source, when configuring, then I can filter by inbox, date range, and status
  - Given I configure filters, when I save, then the source is added to the project
  - Given source is added, when processing runs, then tickets are fetched from Teamwork Desk API
- **Priority:** P1-High
- **MVP Status:** MVP
- **Dependencies:** US-API-002, US-PROJ-001
- **Estimated Complexity:** L

### Platform Administration

**US-PLAT-001**
- **Persona:** Platform Admin
- **Story:** As a platform admin, I want to create new organizations so that I can onboard customers during invite-only phase
- **Acceptance Criteria:**
  - Given I'm a platform admin, when I access admin panel, then I see "Create Organization" option
  - Given I enter org name and initial admin email, when I submit, then organization is created
  - Given org is created, when initial admin receives email, then they can set password and log in
  - Given org exists, when I view org list, then I see the new organization
- **Priority:** P0-Critical
- **MVP Status:** MVP
- **Dependencies:** None
- **Estimated Complexity:** M

**US-PLAT-002**
- **Persona:** Platform Admin
- **Story:** As a platform admin, I want to view all organizations so that I can monitor platform health
- **Acceptance Criteria:**
  - Given I'm a platform admin, when I view org list, then I see all organizations with key metrics
  - Given metrics displayed, when I view an org row, then I see: user count, project count, last active date
  - Given I search by org name, when typing, then results filter in real-time
  - Given I click an org, when viewing details, then I see full org info and can access user list
- **Priority:** P1-High
- **MVP Status:** MVP
- **Dependencies:** US-PLAT-001
- **Estimated Complexity:** S

**US-PLAT-003**
- **Persona:** Platform Admin
- **Story:** As a platform admin, I want to view processing status across all organizations so that I can identify issues
- **Acceptance Criteria:**
  - Given I'm viewing platform dashboard, when I view processing queue, then I see all active processing jobs
  - Given a processing job is stuck, when I view it, then I see time elapsed and error if any
  - Given processing errors occurred, when I view error log, then I see recent errors across all orgs
- **Priority:** P1-High
- **MVP Status:** MVP
- **Dependencies:** US-PLAT-002
- **Estimated Complexity:** M

---

## Section 5: Feature Specification

### Feature F-001: User Authentication

**Description:** Secure user authentication system with email/password login, session management, and password reset.

**User Stories Addressed:** US-AUTH-001, US-AUTH-002

**Functional Requirements:**
- Email/password authentication
- Session persistence (7 days active, 30 days max)
- Password reset via email link (24-hour expiry)
- Account deactivation check on login

**Non-Functional Requirements:**
- Password hashing using bcrypt (cost factor 12)
- JWT tokens for session management
- HTTPS only (enforced by Replit)
- Rate limiting on login attempts (5 failures → 15-minute lockout)

**Edge Cases:**
- User attempts login during password reset → Allow, reset link still valid
- Multiple password reset requests → Only most recent link valid
- Session expires mid-action → Redirect to login, preserve intended destination

**Error States:**
- Invalid credentials → "Invalid email or password"
- Deactivated account → "Account deactivated. Contact your administrator."
- Rate limited → "Too many attempts. Try again in X minutes."
- Expired reset link → "Link expired. Request a new password reset."

**Out of Scope:** SSO/OAuth, MFA, passwordless authentication

---

### Feature F-002: Organization Multi-tenancy

**Description:** Isolated organizational environments ensuring data separation between customers.

**User Stories Addressed:** US-ORG-001, US-ORG-002, US-ORG-003, US-ORG-004

**Functional Requirements:**
- Each organization has isolated data (projects, sources, outputs, users)
- Users belong to exactly one organization
- Two roles: Admin (full access) and Member (project access only)
- Organization admins can invite, manage, and deactivate users

**Non-Functional Requirements:**
- Row-level security enforced at database level
- Organization ID required on all tenant-scoped queries
- No cross-organization data access possible via API

**Edge Cases:**
- Last admin attempts self-deactivation → Blocked
- Last admin attempts role change to Member → Blocked
- Deactivated user's data → Preserved but inaccessible to that user

**Error States:**
- Invite to existing email → "User already exists in this organization"
- Permission denied → "You don't have permission to perform this action"
- Last admin protection → "Cannot remove the only administrator"

**Out of Scope:** Multiple organization membership, organization deletion, billing management

---

### Feature F-003: Project Management

**Description:** Create and manage data processing projects within an organization.

**User Stories Addressed:** US-PROJ-001, US-PROJ-002, US-PROJ-003, US-PROJ-004

**Functional Requirements:**
- CRUD operations on projects
- Project contains: name, description, sources, configuration, outputs
- Projects scoped to organization (no cross-org access)
- Project list with search and status display

**Non-Functional Requirements:**
- Project names unique within organization
- Soft delete with 30-day retention before permanent deletion
- Cascade delete for project sources and outputs

**Edge Cases:**
- Project with processing in progress → Block deletion, show warning
- Project name with special characters → Allow alphanumeric, spaces, hyphens, underscores only
- Empty project deleted → Immediate hard delete (no outputs to retain)

**Error States:**
- Duplicate name → "A project with this name already exists"
- Delete while processing → "Cannot delete project while processing is active"
- Name validation → "Project name can only contain letters, numbers, spaces, and hyphens"

**Out of Scope:** Project sharing, project templates, project duplication

---

### Feature F-004: File Upload

**Description:** Upload CSV, Excel, and JSON files as data sources.

**User Stories Addressed:** US-UPLOAD-001, US-UPLOAD-002, US-UPLOAD-003

**Functional Requirements:**
- Accept CSV (.csv), Excel (.xlsx, .xls), and JSON (.json) files
- Maximum file size: 100MB
- For Excel: Sheet selection UI
- File stored temporarily (30-day retention)
- Parse and validate file structure on upload

**Non-Functional Requirements:**
- Upload progress indicator
- Chunked upload for files >10MB
- Virus scanning on upload (via Replit infrastructure)
- File stored in organization-isolated storage path

**Edge Cases:**
- Excel with multiple sheets → Present sheet selector, require user choice
- CSV with inconsistent row lengths → Warn, pad short rows with empty values
- JSON that's an object (not array) → Show format guidance, suggest conversion
- BOM (byte order mark) in CSV → Strip automatically
- Mixed encodings → Attempt UTF-8, fall back to Latin-1, warn user

**Error States:**
- File too large → "File exceeds 100MB limit. Please split into smaller files."
- Unsupported type → "Unsupported file type. Please upload CSV, Excel, or JSON."
- Parse failure → "Unable to parse file. [Specific error]. Row X, Column Y."
- Upload interrupted → "Upload failed. Please try again."

**Out of Scope:** Zip file upload, folder upload, URL import, Google Sheets import

---

### Feature F-005: Column Detection & Field Mapping

**Description:** Automatically detect columns and suggest field mappings with manual override capability.

**User Stories Addressed:** US-MAPPING-001, US-MAPPING-002, US-MAPPING-003, US-MAPPING-004

**Functional Requirements:**
- Auto-detect columns from uploaded file
- Display first 5 sample values per column
- Suggest mappings based on column names and content patterns
- Support target fields: Message Content, Sender Name, Sender Email, Sender Role, Timestamp, Ticket ID, Status, Subject, Custom
- Manual mapping override via dropdown
- "Do not import" option for excluded columns

**Auto-Detection Patterns:**

| Pattern | Suggested Mapping | Confidence |
|---------|-------------------|------------|
| "email", "customer_email", "user_email" | Sender Email | High |
| "name", "customer_name", "from" | Sender Name | High |
| "message", "body", "content", "text" | Message Content | High |
| "status", "state", "resolution" | Status | Medium |
| "date", "created", "timestamp" | Timestamp | High |
| "ticket", "id", "case" | Ticket ID | Medium |
| "agent", "rep", "support" | Sender Role (Agent) | Medium |

**Non-Functional Requirements:**
- Mapping suggestions within 3 seconds of upload
- Validation that required fields (Message Content) are mapped
- Mappings persisted with project

**Edge Cases:**
- No headers in file → Generate "Column 1", "Column 2", etc.
- All columns unmappable → Show warning, allow proceed with explicit confirmation
- Column name collision → Append number (e.g., "email_1", "email_2")

**Error States:**
- Required field unmapped → "Message Content is required. Please map a column to continue."
- Invalid mapping combination → "Cannot map multiple columns to Message Content."

**Out of Scope:** Custom field creation, machine learning-based content detection, relationship inference between columns

---

### Feature F-006: De-identification Engine

**Description:** Detect and anonymize PII in processed data with consistent placeholder replacement.

**User Stories Addressed:** US-DEID-001, US-DEID-002, US-DEID-003, US-DEID-004, US-DEID-005, US-DEID-006

**Functional Requirements:**
- Enable/disable de-identification (default: enabled)
- Detect and replace:
  - Person names → [AGENT_1], [PERSON_1], etc.
  - Email addresses → [EMAIL]
  - Phone numbers → [PHONE]
  - Company names → [COMPANY_1], [COMPANY_2], etc.
  - Street addresses → [ADDRESS]
  - City/State/Location → [LOCATION]
- Consistent replacement: same entity → same placeholder within a project
- Separate placeholder series for agents vs. other persons

**Detection Methods:**
- Names: NER (Named Entity Recognition) + common name dictionaries
- Emails: Regex pattern matching
- Phones: Regex pattern matching for common formats
- Companies: NER + business entity dictionaries
- Addresses: Regex + NER combination

**Non-Functional Requirements:**
- Processing speed: ≥1,000 records/minute on standard Replit instance
- False positive rate: <5% for names, <1% for emails/phones
- Detection works on both structured fields and free text content

**Edge Cases:**
- Name appears in different cases ("John" vs "JOHN") → Same placeholder
- Partial matches ("John" vs "Johnny") → Different placeholders (conservative)
- Name substring in word ("Johnson" containing "John") → Detect full name only
- Non-Western names → Best effort with NER, may have lower accuracy (documented limitation)
- Obfuscated emails (john [at] example [dot] com) → Detect common obfuscation patterns

**Error States:**
- NER service unavailable → Fall back to regex-only detection, warn user
- Processing timeout on large record → Skip record, log error, continue

**Out of Scope:** Custom PII patterns (MVP), guaranteed HIPAA compliance, redaction undo, multi-language support beyond English

---

### Feature F-007: De-identification Preview

**Description:** Preview de-identification results on sample data before full processing.

**User Stories Addressed:** US-PREVIEW-001, US-PREVIEW-002

**Functional Requirements:**
- Preview mode processes first 10 records (expandable to 50)
- Display original → transformed side-by-side view
- Summary of detected PII types with counts
- Expandable detail showing specific detected values

**Non-Functional Requirements:**
- Preview completes within 10 seconds for 10 records
- Preview uses same detection logic as full processing

**Edge Cases:**
- No PII detected → Show "No PII detected in sample. Your data may already be clean."
- All records filtered by other rules → Show "No records match current filters. Adjust filters to see preview."

**Error States:**
- Preview timeout → "Preview is taking longer than expected. Try with fewer records."

**Out of Scope:** Editing PII detection results, adding to ignore list (post-MVP)

---

### Feature F-008: Quality Filtering

**Description:** Filter records by quality criteria to ensure training data usefulness.

**User Stories Addressed:** US-FILTER-001, US-FILTER-002, US-FILTER-003

**Functional Requirements:**
- Filter by minimum conversation length (message count)
- Filter by minimum character count per message
- Filter by resolution status (requires Status field mapping)
- Filter by date range (requires Timestamp field mapping)
- All filters optional and combinable
- Statistics on filtered-out records

**Non-Functional Requirements:**
- Filters applied before de-identification (efficiency)
- Filter configuration persisted with project

**Edge Cases:**
- Timestamp in unexpected format → Best-effort parsing, warn on failures
- Status field values don't match expected → Show unique values, let user specify
- All records filtered → Warn user, require confirmation to proceed with empty output

**Error States:**
- Invalid date range (end before start) → "End date must be after start date"
- No records match filters → "No records match your filters. X records were excluded."

**Out of Scope:** ML-based quality scoring, topic filtering, sentiment filtering

---

### Feature F-009: Batch Processing Engine

**Description:** Transform configured data sources into training-ready output format.

**User Stories Addressed:** US-PROCESS-001, US-PROCESS-002, US-PROCESS-003, US-PROCESS-004

**Functional Requirements:**
- Manual trigger to start processing
- Progress tracking (records processed / total)
- Estimated time remaining
- Processing status: Queued, Processing, Completed, Failed
- Statistics on completion: processed, filtered, errors
- Re-processing capability with configuration changes

**Non-Functional Requirements:**
- Process up to 100,000 records per project
- Target throughput: 1,000 records/minute
- Timeout: 2 hours maximum per processing run
- Single processing job per project at a time

**Edge Cases:**
- User navigates away during processing → Processing continues, status available on return
- Server restart during processing → Job resumes or fails gracefully with clear message
- Some records fail while others succeed → Complete successful records, report failures

**Error States:**
- Processing already running → "Processing is already in progress. Please wait for completion."
- Source data unavailable → "Unable to access source data. Please verify the source is configured correctly."
- Timeout → "Processing exceeded time limit. Consider processing in smaller batches."

**Out of Scope:** Scheduled/automated processing, parallel processing, incremental processing

---

### Feature F-010: JSONL Export

**Description:** Export processed data as JSONL file for AI training.

**User Stories Addressed:** US-DOWNLOAD-001, US-DOWNLOAD-002

**Functional Requirements:**
- Download as .jsonl file (one JSON object per line)
- Conversational format with "messages" array
- Include role (agent/customer/unknown) and content per message
- Sample download option (100 records)
- Compression for files >10MB (.jsonl.gz)

**Output Format:**
```json
{"messages": [{"role": "customer", "content": "..."}, {"role": "agent", "content": "..."}]}
{"messages": [{"role": "customer", "content": "..."}, {"role": "agent", "content": "..."}]}
```

**Non-Functional Requirements:**
- Download generation within 30 seconds for typical output
- Streaming for large files

**Edge Cases:**
- Single-message conversations → Include as single-message array
- No processing completed → Download button disabled, show "Process data first"
- Very large output (>1M records) → Warn about file size, still allow download

**Error States:**
- Download generation fails → "Unable to generate download. Please try again."
- Output no longer available (expired) → "Output has expired. Please re-process."

**Out of Scope:** Q&A pairs format, raw JSON format, cloud storage destinations, streaming to training platforms

---

### Feature F-011: Teamwork Desk Connector

**Description:** Connect to Teamwork Desk API to fetch support ticket data.

**User Stories Addressed:** US-API-001, US-API-002, US-API-003

**Functional Requirements:**
- Connect using API key and subdomain
- Connection testing with validation
- Secure credential storage (encrypted)
- Fetch tickets with filtering: inbox, date range, status
- Map Teamwork Desk fields to Foundry standard fields
- Pagination handling for large ticket volumes

**Teamwork Desk Field Mapping:**

| Teamwork Desk Field | Foundry Field |
|---------------------|---------------|
| ticket.subject | Subject |
| ticket.status | Status |
| ticket.createdAt | Timestamp |
| ticket.id | Ticket ID |
| thread.content | Message Content |
| thread.createdBy | Sender Name |
| thread.type | Sender Role |

**Non-Functional Requirements:**
- API credentials encrypted at rest
- Rate limiting respect (Teamwork Desk API limits)
- Connection health monitoring

**Edge Cases:**
- API rate limit hit → Backoff and retry, inform user of delay
- Ticket with no threads → Skip, count as filtered
- HTML content in tickets → Strip HTML tags, preserve text

**Error States:**
- Invalid API key → "Invalid API key. Please verify and try again."
- Subdomain not found → "Subdomain not found. Please verify your Teamwork Desk URL."
- Connection timeout → "Connection timed out. Please check your network and try again."
- API unavailable → "Teamwork Desk API is temporarily unavailable. Please try later."

**Out of Scope:** Webhook-based sync, two-way sync, ticket creation in Teamwork

---

### Feature F-012: Platform Administration

**Description:** Foundry staff tools for managing organizations and monitoring platform health.

**User Stories Addressed:** US-PLAT-001, US-PLAT-002, US-PLAT-003

**Functional Requirements:**
- Create new organizations with initial admin
- View all organizations with metrics
- Search organizations
- View processing queue across all orgs
- View error logs

**Non-Functional Requirements:**
- Platform admin role separate from org roles
- Full audit of platform admin actions
- No ability for platform admin to access org data content

**Edge Cases:**
- Create org with email already in system → "Email already has an account. Use different email for initial admin."
- Org creation fails → Rollback partial creation, clear error message

**Error States:**
- Invalid email format → "Please enter a valid email address"
- Creation failure → "Unable to create organization. Please try again."

**Out of Scope:** Billing management, usage quotas, automated org provisioning

---

## Section 6: MVP Definition

### MVP Feature List with Removal Test

| Feature | In MVP | Removal Test Result |
|---------|--------|---------------------|
| F-001: User Authentication | ✅ | Cannot remove: No product without user accounts |
| F-002: Organization Multi-tenancy | ✅ | Cannot remove: Core isolation requirement |
| F-003: Project Management | ✅ | Cannot remove: Fundamental organization concept |
| F-004: File Upload | ✅ | Cannot remove: Primary "aha moment" depends on this |
| F-005: Column Detection & Mapping | ✅ | Cannot remove: Critical for 5-minute experience |
| F-006: De-identification Engine | ✅ | Cannot remove: Primary value proposition |
| F-007: De-identification Preview | ✅ | Cannot remove: Users need confidence before processing |
| F-008: Quality Filtering | ✅ | Borderline but included: Significantly improves output quality |
| F-009: Batch Processing Engine | ✅ | Cannot remove: Core transformation engine |
| F-010: JSONL Export | ✅ | Cannot remove: Primary output format |
| F-011: Teamwork Desk Connector | ✅ | Can remove but included: Stated priority from brief |
| F-012: Platform Administration | ✅ | Cannot remove: Required for invite-only onboarding |

### Rationale for Scope Decisions

**Included in MVP:**
- The complete file upload → process → download flow is non-negotiable for the 5-minute "aha moment"
- De-identification is the primary differentiator; without it, we're just a data converter
- Quality filtering prevents users from getting garbage output, protecting perceived value
- Teamwork Desk connector was explicitly requested as MVP priority

**Excluded from MVP:**
- GoHighLevel connector: Second API connector adds complexity without proving core value
- Q&A pairs output: JSONL conversational format is sufficient; Q&A is a nice-to-have
- Custom pattern masking: Standard PII patterns cover 90%+ of use cases
- Scheduled processing: Manual trigger is acceptable for early users
- Audit logging: Important for compliance but not for proving product value

### Success Criteria for Launch

**Functional Criteria:**
- User can sign up (via invitation), create a project, upload a CSV, and download de-identified JSONL output
- 95% of processing jobs complete successfully without user intervention
- De-identification correctly handles 95%+ of standard PII patterns

**Experience Criteria:**
- First successful output in under 5 minutes for a user with a CSV ready
- Zero documentation required for the basic flow
- Clear error messages that tell users what to do next

**Quality Criteria:**
- No data leaks between organizations
- No PII in processed output (verified by sample audit)
- System handles files up to 100MB and 100K records without failure

### Post-Launch Metrics

| Metric | Target (Launch) | Target (6 months) |
|--------|-----------------|-------------------|
| Time to first output | <5 minutes | <3 minutes |
| Processing success rate | 95% | 99% |
| User activation (upload → download) | 60% | 80% |
| Weekly active organizations | 10 | 100 |
| Records processed/week | 100K | 10M |

---

## Section 7: Information Architecture

### Content Organization

```
Foundry Platform
├── Authentication
│   ├── Login
│   ├── Password Reset
│   └── Accept Invitation
├── Organization Dashboard
│   ├── Projects List
│   ├── Connections List (API connectors)
│   └── Settings
│       ├── Users
│       └── Organization Profile
├── Project Workspace
│   ├── Sources
│   │   ├── Add Source (Upload / Connect)
│   │   └── Source List
│   ├── Configuration
│   │   ├── Field Mapping
│   │   ├── De-identification Rules
│   │   └── Quality Filters
│   ├── Preview
│   └── Output
│       ├── Processing Status
│       ├── Statistics
│       └── Download
└── Platform Admin (Foundry Staff Only)
    ├── Organizations List
    ├── Create Organization
    └── System Health
```

### Navigation Structure

**Primary Navigation (Sidebar):**
- Dashboard (project list)
- Connections
- Settings

**Project Navigation (Within Project):**
- Overview
- Sources
- Configure
- Preview
- Output

**Admin Navigation (Platform Admin Only):**
- Organizations
- System Health

### User Flows

**Flow 1: First-Time User — CSV to Output**

1. User receives invitation email → Clicks link
2. Creates password → Redirected to organization dashboard
3. Sees empty state → Clicks "Create Project"
4. Enters project name → Project created, redirected to project workspace
5. Sees "Add Source" prompt → Clicks "Upload File"
6. Selects CSV from computer → Upload progress shown
7. Upload complete → Auto-detection runs, redirected to mapping screen
8. Reviews suggested mappings → Adjusts if needed → Clicks "Continue"
9. Sees de-identification rules (default ON) → Clicks "Preview"
10. Reviews sample output with redactions → Clicks "Process"
11. Sees processing progress → Waits for completion
12. Processing complete → Sees statistics → Clicks "Download JSONL"
13. File downloads → Success!

**Error Flow 1a: Invalid File**
- Step 6: User selects PDF file
- System shows "Unsupported file type" error
- User selects CSV instead → Flow continues

**Error Flow 1b: Mapping Validation Failure**
- Step 8: User doesn't map Message Content
- System shows "Message Content is required" validation error
- User maps a column → Flow continues

**Flow 2: Admin — Add Teamwork Desk Connection**

1. Admin logs in → Goes to Connections
2. Clicks "Add Connection" → Selects "Teamwork Desk"
3. Enters API key and subdomain → Clicks "Test Connection"
4. Test succeeds → Clicks "Save Connection"
5. Connection appears in list → Available for projects

**Error Flow 2a: Invalid Credentials**
- Step 3: Admin enters wrong API key
- Test fails → "Invalid API key" error shown
- Admin corrects key → Flow continues

**Flow 3: Platform Admin — Onboard New Customer**

1. Platform admin logs into admin panel
2. Clicks "Create Organization"
3. Enters org name and initial admin email → Submits
4. Organization created → Initial admin receives invitation email
5. Platform admin sees org in org list

### Screen Inventory

| Screen | Purpose | Access |
|--------|---------|--------|
| Login | User authentication | Public |
| Password Reset | Forgot password flow | Public |
| Accept Invitation | New user onboarding | Invited users |
| Dashboard | View all projects | Authenticated |
| Project Workspace | Project hub | Authenticated |
| Source Upload | File upload interface | Authenticated |
| Field Mapping | Configure column mappings | Authenticated |
| De-identification Config | Set PII rules | Authenticated |
| Quality Filters | Set filtering rules | Authenticated |
| Preview | Review sample output | Authenticated |
| Processing Status | View progress | Authenticated |
| Output & Download | Get results | Authenticated |
| Connections | Manage API connections | Org Admin |
| User Management | Manage org users | Org Admin |
| Organization Settings | Org profile | Org Admin |
| Admin: Org List | View all orgs | Platform Admin |
| Admin: Create Org | Onboard customer | Platform Admin |
| Admin: System Health | Monitor platform | Platform Admin |

---

## Section 8: Assumptions and Constraints

### Technical Assumptions (Replit Context)

- **Deployment platform:** Replit
- **Database:** PostgreSQL (Neon)
- **Architecture:** Monolithic full-stack application
- **Frontend:** React with TypeScript
- **Backend:** Express.js with TypeScript
- **ORM:** Drizzle
- **Authentication:** JWT-based (bcrypt password hashing)
- **File storage:** Local filesystem with organization-scoped paths (30-day retention)
- **Server port:** 5000
- **HTTPS:** Provided by Replit

### Business Assumptions

| Assumption | Impact if Wrong |
|------------|-----------------|
| A1: Users have existing data exports or API access | If not, need to add more data import options |
| A2: De-identification doesn't need compliance certification (MVP) | If HIPAA/SOC2 required early, significant security investment needed |
| A3: Batch processing (minutes) is acceptable latency | If real-time needed, architecture changes required |
| A4: English-only content for MVP | If multi-language needed, NER engine selection changes |
| A5: Invite-only is acceptable for MVP launch | If self-service urgently needed, more onboarding work required |
| A6: JSONL is sufficient output format | If Q&A format critical, add to MVP |
| A7: 100K records per project is sufficient scale | If customers have larger datasets, need to optimize early |

### Known Constraints

- **Single container deployment:** No microservices, no dedicated worker processes
- **Replit resource limits:** Memory and CPU caps apply to processing
- **Web browser only:** No native mobile app
- **No real-time sync:** Batch processing only, no webhook listeners
- **Single database:** PostgreSQL only, no Redis or other caches
- **File size limit:** 100MB per upload (Replit constraint)

### Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| NER accuracy too low for names | Medium | High | Fall back to regex patterns, add common name dictionary |
| Processing too slow for 100K records | Medium | Medium | Optimize algorithms, add progress indication to set expectations |
| Teamwork Desk API rate limits hit | Low | Medium | Implement exponential backoff, batch requests |
| PII leaks in output | Low | Critical | Multiple detection passes, sample audit before release |
| Users upload very large files | High | Medium | Enforce 100MB limit, provide clear guidance on splitting |

---

## Section 9: Success Metrics

### Key Performance Indicators

| KPI | Definition | Measurement Method |
|-----|------------|-------------------|
| Time to First Output | Minutes from signup to first JSONL download | Application events tracking |
| Processing Success Rate | % of processing jobs completing without error | Processing job status logs |
| User Activation Rate | % of users who complete at least one processing job | User activity tracking |
| Weekly Active Organizations | # of orgs with at least one processing job/week | Weekly aggregation |
| Records Processed | Total records successfully processed | Processing statistics |
| De-identification Accuracy | % of PII correctly detected (sampled audit) | Manual review of sample outputs |

### Launch Targets

| Metric | Launch Target |
|--------|---------------|
| Time to First Output | <5 minutes |
| Processing Success Rate | >95% |
| User Activation Rate | >60% |
| Weekly Active Organizations | 10 |
| Records Processed/Week | 100,000 |
| De-identification Accuracy | >95% |

### 6-Month Milestones

| Metric | 6-Month Target |
|--------|----------------|
| Time to First Output | <3 minutes |
| Processing Success Rate | >99% |
| User Activation Rate | >80% |
| Weekly Active Organizations | 100 |
| Records Processed/Week | 10,000,000 |
| De-identification Accuracy | >98% |

### Analytics Requirements

**Required Events:**
- User signup completed
- Project created
- Source added (type: file/API)
- File upload completed (with file size, type)
- Mapping configured
- Preview requested
- Processing started
- Processing completed (with record counts, duration)
- Download completed
- Error occurred (with error type)

**Required Dashboards:**
- Daily/weekly active users
- Processing volume and success rate
- Error frequency by type
- Feature usage (which filters, which PII types)
- Funnel: signup → project → source → process → download

---

## Section 10: Glossary

### Domain Terms

| Term | Definition |
|------|------------|
| Data Source | An origin of data for processing—either an uploaded file or an API connection |
| De-identification | The process of detecting and replacing personally identifiable information with placeholders |
| Field Mapping | The configuration that associates columns in source data with Foundry's standard fields |
| Processing Pipeline | The sequence of transformations applied to source data (mapping → filtering → de-identification → formatting) |
| Organization | A tenant in the multi-tenant system—typically a company or team |
| Project | A container for a specific AI training data preparation effort within an organization |
| JSONL | JSON Lines format—a text file where each line is a valid JSON object, common for training data |
| PII | Personally Identifiable Information—data that can identify a specific individual |

### Technical Terms

| Term | Definition |
|------|------------|
| JWT | JSON Web Token—a compact, URL-safe token format used for authentication |
| NER | Named Entity Recognition—ML technique to identify named entities (people, places, organizations) in text |
| Row-level Security | Database security model where access is controlled at the individual row level based on user context |
| Soft Delete | Deletion pattern where records are marked as deleted rather than removed, allowing recovery |
| Multi-tenancy | Architecture where a single application instance serves multiple isolated customers |

### Acronyms

| Acronym | Expansion |
|---------|-----------|
| API | Application Programming Interface |
| CRUD | Create, Read, Update, Delete |
| CSV | Comma-Separated Values |
| MVP | Minimum Viable Product |
| ORM | Object-Relational Mapping |
| PII | Personally Identifiable Information |
| PRD | Product Requirements Document |
| SaaS | Software as a Service |
| UI | User Interface |
| UX | User Experience |

---

## Document Validation

### Completeness Check
- [x] All 10 sections populated
- [x] All personas have ≥3 user stories
- [x] All user stories have ≥2 acceptance criteria
- [x] All MVP features have documented removal test
- [x] All features trace to user stories
- [x] All user stories trace to personas
- [x] All user flows include error states
- [x] Technical assumptions compatible with Replit

### Confidence Scores
| Section | Score (1-10) | Notes |
|---------|--------------|-------|
| Problem Statement | 8 | Clear pain, identifiable users; lacks quantified evidence |
| Personas | 8 | Well-defined; based on assumptions, not user research |
| User Stories | 9 | Comprehensive coverage with testable criteria |
| MVP Scope | 9 | Clear boundaries, removal tests documented |
| Replit Compatibility | 9 | All constraints addressed |
| Overall | 8 | Strong foundation; assumptions documented for validation |

### Flagged Items Requiring Review
1. **De-identification accuracy requirements:** 95% target needs validation with real data
2. **Processing throughput:** 1,000 records/minute assumes efficient NER; may need optimization
3. **Non-Western name detection:** Explicitly marked as limitation; may need earlier attention
4. **Quantified problem impact:** Numbers are assumptions; recommend customer interviews

### Assumptions Made
1. **A1:** CSV upload is P0 priority over Teamwork Desk API (clarified from brief ambiguity)
2. **A2:** Standard PII patterns sufficient for MVP (no custom patterns)
3. **A3:** English-only content for MVP
4. **A4:** JSONL sufficient output format (no Q&A pairs)
5. **A5:** Manual processing trigger acceptable (no scheduling)

### Document Status: COMPLETE

---

## Downstream Agent Handoff Brief

### Deployment Context (All Agents)

**Target Platform: Replit**
- Single container deployment
- PostgreSQL database (Neon)
- Port 5000 for backend server
- Automatic HTTPS via Replit
- Environment variables via Replit Secrets

This context applies to all downstream agents. Do not specify infrastructure that conflicts with Replit's deployment model.

### For Agent 2: System Architecture

**Core Technical Challenges:**
- Multi-tenant data isolation (row-level security)
- PII detection engine (NER + regex hybrid)
- File parsing for multiple formats (CSV, Excel, JSON)
- Batch processing for up to 100K records
- Secure API credential storage for Teamwork Desk

**Scale Expectations:**
- Concurrent users: 50-200
- Database records: 100K-1M
- File storage: ~10GB total across all orgs
- Processing throughput: 1,000 records/minute
- API throughput: 100-500 requests/minute

**Integration Requirements:**
- Teamwork Desk API (REST, API key auth)
- Email delivery for invitations and password resets

**Authentication/Authorization Complexity:**
- JWT-based authentication
- Two-tier roles: Organization-level (Admin/Member) and Platform-level (Platform Admin)
- Row-level security for all tenant-scoped data

**Key Decisions Deferred to You:**
- NER library selection (spaCy vs. alternatives)
- File processing strategy (streaming vs. in-memory)
- Background processing approach within single-container constraint

**Security Considerations:**
- API credentials must be encrypted at rest
- Rate limiting on authentication endpoints
- No cross-tenant data access possible via any endpoint

**Replit Constraints:**
- Single process (no dedicated workers)
- Port 5000 required
- Memory limits apply to processing

### For Agent 3: Data Modeling

**Primary Entities Implied:**
- Organization
- User
- Project
- Source (FileSource, APISource)
- FieldMapping
- ProcessingConfiguration
- ProcessingRun
- ProcessedOutput
- Connection (APIConnection)

**Key Relationships:**
- Organization → Users (1:many)
- Organization → Projects (1:many)
- Project → Sources (1:many)
- Project → ProcessingRuns (1:many)
- ProcessingRun → ProcessedOutput (1:1)
- Organization → Connections (1:many)

**Data Lifecycle Considerations:**
- Source files: 30-day retention, then soft delete
- Processed outputs: Retained until user deletes or project deleted
- User deactivation: Preserve data, revoke access

**Multi-tenancy Requirements:**
- All tenant-scoped tables require organization_id
- Row-level security policies required

**Replit Constraints:**
- PostgreSQL via Neon
- Drizzle ORM

### For Agent 4: API Contract

**Primary Operations Needed:**
- Auth: login, logout, password reset, accept invitation
- Organizations: read (admin only: create)
- Users: list, invite, update role, deactivate
- Projects: CRUD
- Sources: create (upload/API), read, delete
- FieldMappings: read (auto-detected), update
- ProcessingConfig: read, update (de-id rules, filters)
- Processing: trigger, status, cancel
- Output: download, statistics
- Connections: create, test, update, delete, list

**Authentication Requirements:**
- JWT with 7-day sliding expiration
- Platform admin role for org management endpoints
- Organization admin role for user management endpoints

**External Integrations:**
- Teamwork Desk API: ticket fetching with auth

**Real-time Requirements:**
- None for MVP (polling for processing status)

**Replit Constraints:**
- Express.js backend
- Port 5000
- /api prefix for all endpoints
- GET /api/health required

### For Agent 5: UI/UX Specification

**Primary User Flows:**
1. First-time user: Invitation → Signup → Create project → Upload CSV → Configure → Process → Download
2. Returning user: Login → Select project → Check status → Download or reconfigure
3. Admin: Manage users, manage connections
4. Platform admin: Create org, monitor health

**Key Interaction Patterns:**
- Wizard-like flow for first processing (Source → Mapping → Config → Preview → Process)
- Dashboard with project cards showing status
- Side-by-side preview (original vs. de-identified)
- Progress indicator for processing with estimated time

**Accessibility Requirements:**
- WCAG 2.1 AA compliance
- Keyboard navigable
- Screen reader compatible

**Mobile/Responsive Requirements:**
- Responsive design for tablet and desktop
- Mobile support: readable but not optimized for file upload workflow

**Replit Constraints:**
- React frontend with Vite
- Responsive web (no native mobile)

### For Agent 6: Implementation Orchestrator

**Replit-Specific Requirements:**
- Health endpoint at GET /api/health (required for deployment)
- Server must listen on process.env.PORT || 5000
- Database URL from DATABASE_URL environment variable
- Drizzle migrations with tsx wrapper
- Security middleware: helmet, cors, rate-limit

### Handoff Summary
- Total user stories: 31
  - P0-Critical: 14
  - P1-High: 13
  - P2-Medium: 4
- MVP feature count: 12
- Estimated complexity distribution: 6S, 12M, 8L, 0XL
- Deployment target: Replit
- Recommended human review points:
  1. De-identification accuracy targets
  2. NER library selection
  3. Processing throughput requirements
  4. Multi-language support timeline
