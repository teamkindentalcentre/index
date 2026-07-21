# Plato Medical to SIDEXIS 4 via SLIDA  
## Integration Master Plan for Kin Dental Centre

**Document status:** Initial planning document  
**Purpose:** Preserve the full context of the proposed integration so the project can be continued later.  
**Primary goal:** Reduce patient-identification errors and duplicate patient records when taking dental X-rays.

---

## 1. Background

Kin Dental Centre uses:

- **Plato Medical** as the practice management system.
- **SIDEXIS 4** as the dental imaging and X-ray software.
- **Sirona SLIDA** as the interface intended to connect SIDEXIS with external dental applications.
- A likely **central SIDEXIS database or server**, with SIDEXIS available on multiple clinic or X-ray workstations.

At present, Plato Medical and SIDEXIS 4 do not have a direct vendor-supported integration in the clinic's setup.

The clinic therefore wants to build and own a custom integration.

---

## 2. Main Problem

Patient details may need to be entered separately into Plato Medical and SIDEXIS.

This creates several risks:

- The wrong patient may be selected before an X-ray is taken.
- Duplicate patients may be created in SIDEXIS.
- Names may be spelt differently between systems.
- Identification numbers or dates of birth may be entered incorrectly.
- Staff may accidentally attach images to the wrong patient.
- Patient demographic updates may not be reflected in both systems.
- Manual double entry increases administrative work.

---

## 3. Desired Outcome

Plato Medical should be the **single source of truth** for patient demographics.

When a patient is created or updated in Plato Medical, the relevant patient details should be transferred to SIDEXIS 4 through SLIDA.

The ideal workflow is:

1. Reception creates or updates the patient in Plato Medical.
2. The integration detects the new or changed patient.
3. The integration validates and maps the patient details.
4. The integration passes the patient information to SLIDA.
5. SIDEXIS 4 opens or creates the correct patient record.
6. The radiography operator confirms the patient's identity.
7. The X-ray is taken and stored under the correct patient.
8. The integration records the result in an audit log.

The first version should be a **one-way integration**:

> Plato Medical → Integration Service → SLIDA → SIDEXIS 4

SIDEXIS should not overwrite Plato Medical in the initial version.

---

## 4. Important Assumptions to Verify

The following points were discussed but must be confirmed before coding begins:

### Plato Medical

Confirm whether Plato Medical provides:

- A documented API.
- API credentials or an API key.
- Permission to access patient demographic data.
- An endpoint to retrieve patients.
- An endpoint to retrieve one patient.
- A way to retrieve patients updated after a certain date and time.
- Webhooks for new or updated patients.
- Stable internal patient IDs.
- API rate limits.
- A test or sandbox environment.
- Documentation on authentication.
- Rules governing API use and patient data.

### SIDEXIS 4 and SLIDA

Confirm:

- The installed SIDEXIS 4 version.
- The exact installed SLIDA version.
- Whether SLIDA is licensed and enabled.
- Whether the SLIDA developer documentation or SDK is available.
- Whether SLIDA supports creating or opening patients.
- Whether SLIDA supports updating existing patients.
- Whether SLIDA is invoked through:
  - command-line parameters,
  - files,
  - Windows messages,
  - DLLs,
  - an executable,
  - DICOM worklist,
  - or another mechanism.
- Which patient fields SLIDA accepts.
- How SIDEXIS uniquely identifies patients.
- Whether SLIDA must run on each workstation or only on the central SIDEXIS server.
- Whether all workstations point to one shared SIDEXIS database.
- Whether Dentsply Sirona permits a custom local integration under the clinic's licence.

Do not begin production coding until the supported SLIDA integration method is confirmed from official documentation or the vendor.

---

## 5. Recommended Architecture

The proposed application is a small locally hosted integration service.

### Working Name

**Kin Integration Hub**

The first module would be:

**Plato-to-SIDEXIS Patient Sync**

### High-Level Architecture

```text
Plato Medical
     |
     | API or webhook
     v
Kin Integration Hub
     |
     | Validate, map, deduplicate, queue and log
     v
SLIDA Adapter
     |
     v
SIDEXIS 4
     |
     v
X-ray workstation and imaging database
```

### Core Components

#### 5.1 Plato Connector

Responsibilities:

- Authenticate with Plato Medical.
- Retrieve new and updated patients.
- Convert Plato API responses into an internal patient format.
- Track the latest successful retrieval time.
- Handle expired credentials and API failures.
- Avoid downloading the entire patient database unnecessarily.

#### 5.2 Canonical Patient Model

The integration should use its own internal patient structure.

Example:

```json
{
  "sourceSystem": "Plato",
  "sourcePatientId": "PLATO-12345",
  "clinicCode": "KIN-WC",
  "fullName": "Sample Patient",
  "givenName": "Sample",
  "familyName": "Patient",
  "dateOfBirth": "1985-07-20",
  "sex": "F",
  "nationalId": "masked-or-hashed-value",
  "mobile": "+6591234567",
  "email": "sample@example.com",
  "address": "Singapore",
  "lastModifiedAt": "2026-07-20T12:30:00+08:00"
}
```

The exact fields should be limited to those genuinely required by SIDEXIS.

#### 5.3 Mapping and Validation Engine

Responsibilities:

- Map Plato fields to SLIDA fields.
- Standardise date formats.
- Standardise sex or gender values according to the supported SLIDA format.
- Trim unnecessary spaces.
- Normalise names.
- Reject records with missing mandatory fields.
- Detect obviously invalid dates of birth.
- Prevent accidental overwriting of the wrong SIDEXIS patient.

#### 5.4 Sync Queue

Every patient change should become a sync job.

Possible job states:

- `Pending`
- `Processing`
- `Succeeded`
- `Retrying`
- `Failed`
- `RequiresReview`
- `Ignored`

The queue ensures that patient updates are not lost when:

- SIDEXIS is unavailable.
- The network is unavailable.
- Plato is temporarily unavailable.
- The workstation is switched off.
- SLIDA returns an error.

#### 5.5 SLIDA Adapter

This is the part of the application that communicates with SLIDA.

Responsibilities:

- Translate the internal patient record into the exact SLIDA-supported format.
- Search for or open the patient in SIDEXIS.
- Create a patient only when it is safe to do so.
- Update a patient only when there is a reliable match.
- Return a clear success or failure result.
- Capture the SIDEXIS patient identifier where possible.

This component must be isolated from the rest of the system because SLIDA-specific implementation details may change.

#### 5.6 Local Database

Recommended initial options:

- **SQLite** for a simple first version.
- **SQL Server Express** if the application will grow into a larger clinic integration platform.

Suggested tables:

##### `Patients`

Stores the relationship between Plato and SIDEXIS.

Suggested fields:

- `Id`
- `PlatoPatientId`
- `SidexisPatientId`
- `ClinicCode`
- `LastPlatoModifiedAt`
- `LastSuccessfulSyncAt`
- `PatientFingerprint`
- `SyncStatus`
- `CreatedAt`
- `UpdatedAt`

##### `SyncJobs`

Stores pending and completed jobs.

Suggested fields:

- `Id`
- `PatientId`
- `JobType`
- `Status`
- `AttemptCount`
- `NextAttemptAt`
- `LastError`
- `CreatedAt`
- `StartedAt`
- `CompletedAt`

##### `AuditLogs`

Stores important actions.

Suggested fields:

- `Id`
- `Timestamp`
- `Action`
- `SourcePatientId`
- `SidexisPatientId`
- `Workstation`
- `Result`
- `ErrorCode`
- `Details`

##### `Settings`

Stores non-secret configuration.

##### `DeadLetterJobs`

Stores jobs that repeatedly fail and require human review.

---

## 6. Identity Matching and Duplicate Prevention

This is the most safety-critical part of the project.

### Primary Matching Rule

Use a permanent, stable Plato patient ID as the main source identifier.

Store the relationship:

```text
PlatoPatientId ↔ SidexisPatientId
```

Once this relationship has been confirmed, future updates should use it.

### Do Not Match by Name Alone

Two patients may have the same or similar name.

Names may also change or be entered differently.

### Possible Secondary Matching Fields

Only use secondary matching for initial reconciliation:

- National identification number, where legally and technically appropriate.
- Date of birth.
- Mobile number.
- Email address.
- Full name.
- Existing clinic patient number.

### Safe Initial-Match Rule

A possible safe approach:

- Exact match on clinic patient number, or
- Exact match on an approved unique identifier, or
- A strong combination such as:
  - full name,
  - date of birth,
  - and mobile number.

Any uncertain match should be marked:

`RequiresReview`

The system should never silently merge two uncertain patient records.

### Patient Fingerprint

A fingerprint can be generated from normalised values, for example:

```text
normalised full name + date of birth + approved identifier
```

This helps detect unexpected changes, but it should not replace a proper patient ID.

---

## 7. Data Mapping Draft

The final mapping depends on the official Plato API and SLIDA documentation.

| Internal Field | Plato Source | SIDEXIS/SLIDA Target | Mandatory | Notes |
|---|---|---|---:|---|
| Plato patient ID | To confirm | External reference if supported | Yes | Main source identifier |
| Clinic patient number | To confirm | Patient ID or comment field | Preferably | Must not collide |
| Given name | To confirm | First name | Yes | Trim and validate |
| Family name | To confirm | Surname | Yes | Confirm name order |
| Full name | Derived | Display field if supported | No | Avoid using as unique key |
| Date of birth | To confirm | Date of birth | Yes | ISO internally |
| Sex | To confirm | Sex | Depends | Map accepted values |
| National ID | To confirm | Patient identifier if supported | Sensitive | Minimise storage |
| Mobile | To confirm | Phone | Optional | Useful for review |
| Email | To confirm | Email | Optional | May not be needed |
| Address | To confirm | Address | Optional | May not be needed |
| Last modified time | To confirm | Not transferred | Yes internally | Used for incremental sync |

Apply the principle of data minimisation: only send SIDEXIS the fields required for safe patient identification and imaging workflow.

---

## 8. Recommended Technology

### Application Platform

- **C#**
- **.NET 8 or the current supported .NET LTS version**
- Windows application or Windows service

C# is recommended because:

- SIDEXIS and SLIDA are Windows-based.
- Vendor examples may use Windows or .NET conventions.
- Windows service deployment is well supported.
- Strong typing helps reduce data-mapping mistakes.
- Logging and background processing libraries are mature.

### Suggested Libraries

Subject to later verification:

- ASP.NET Core for a local dashboard.
- `HttpClient` for Plato API access.
- Entity Framework Core for database access.
- SQLite or SQL Server Express.
- Serilog for structured logs.
- Polly for retry policies.
- Windows Service hosting support.
- DPAPI or Windows Credential Manager for secrets.

Do not place API keys directly inside source code.

---

## 9. Deployment Options

### Preferred Initial Deployment

Install Kin Integration Hub on:

- The central SIDEXIS server, or
- A dedicated Windows computer that:
  - is always switched on,
  - can access SIDEXIS or SLIDA,
  - can securely reach the Plato API,
  - and is backed up.

### Multi-Clinic Considerations

If each clinic has a separate SIDEXIS database:

- Each clinic may need its own local adapter or integration agent.
- A central coordinator may retrieve Plato changes.
- Jobs must be routed to the correct clinic.
- A patient should not be automatically created in every clinic unless that is intentional.

If all clinics share one SIDEXIS database:

- One integration service may be sufficient.
- Workstations should see the same patient records.
- The clinic must still confirm that the SLIDA command must run centrally or locally.

### Avoid Using n8n for the Final SLIDA Call

n8n may still be useful for:

- Alerts.
- Daily summaries.
- Health checks.
- Administrative notifications.

However, the direct SLIDA interaction should preferably be handled by the local Windows application because:

- SLIDA is likely local and Windows-specific.
- A permanent local service is easier to control.
- Patient-data processing should remain within the clinic where possible.
- Error handling and audit logging are more predictable.

---

## 10. Security and Privacy

This integration processes healthcare and patient-identifying information.

The implementation should include:

- Least-privilege API access.
- Encryption in transit.
- Encryption of sensitive secrets at rest.
- Restricted Windows user permissions.
- No API keys in GitHub.
- No real patient data in development screenshots or AI prompts.
- Masked identifiers in routine logs.
- An audit trail of synchronisation actions.
- Retention rules for logs.
- Secure backups.
- A documented incident-response procedure.
- Review for compliance with Singapore's PDPA and applicable healthcare obligations.

Use synthetic test patients during development.

Example:

```text
TEST-SLIDA-001
Name: Integration Test One
DOB: 1990-01-01
```

Clearly mark all test records and remove them before production rollout.

---

## 11. Error Handling

### Retry Strategy

Example:

- Attempt 1: immediately.
- Attempt 2: after 1 minute.
- Attempt 3: after 5 minutes.
- Attempt 4: after 15 minutes.
- Attempt 5: after 1 hour.
- Later attempts: every few hours, subject to the type of error.

### Retryable Errors

Examples:

- Plato API temporarily unavailable.
- Network timeout.
- SIDEXIS temporarily unavailable.
- SLIDA process temporarily busy.
- Database lock.
- Server restart.

### Non-Retryable Errors

Examples:

- Missing date of birth when it is mandatory.
- Invalid patient identifier.
- Multiple possible SIDEXIS matches.
- Unsupported character or data format.
- Access denied due to configuration.
- Invalid API credentials requiring manual intervention.

### Alerting

Do not alert staff after every temporary error.

Alert when:

- A job has failed repeatedly.
- Credentials have expired.
- No patient data has been retrieved for an unusual period.
- SIDEXIS has been unreachable for a sustained period.
- The queue is growing.
- A possible duplicate is detected.
- A patient record requires manual review.

Possible channels:

- Email.
- Telegram.
- A dashboard.
- n8n-generated daily or urgent alerts.

---

## 12. Dashboard

The first dashboard can be simple.

Display:

- Service status.
- Plato API status.
- SIDEXIS or SLIDA status.
- Last successful Plato retrieval.
- Last successful patient sync.
- Number of pending jobs.
- Number of failed jobs.
- Number requiring review.
- Recent sync activity.
- Search by Plato patient ID.
- Retry button.
- Mark-resolved button.
- Export audit log.

Do not display full sensitive patient details unless necessary.

---

## 13. Clinical Workflow

Technology alone is not enough to prevent wrong-patient imaging.

The clinic should use a standard identity check before every X-ray.

### Proposed Workflow

1. Reception creates the patient in Plato Medical.
2. Staff confirm:
   - full name,
   - date of birth,
   - and one additional identifier.
3. The integration synchronises the patient.
4. The radiography operator opens the patient from Plato or through the approved SLIDA workflow.
5. Before exposure, the operator verbally confirms at least two identifiers.
6. The operator confirms the selected patient on the SIDEXIS screen.
7. The X-ray is taken.
8. Any mismatch stops the workflow immediately.
9. The mismatch is documented and corrected before imaging continues.

### Important Rule

The integration reduces risk but does not replace staff identity verification.

---

## 14. Development Roadmap

## Phase 0 — Vendor and Documentation Discovery

Goal: confirm what is technically supported.

Tasks:

- Obtain Plato API documentation.
- Obtain API credentials for a test environment.
- Confirm whether webhooks are available.
- Obtain SLIDA documentation or SDK.
- Confirm licensing.
- Identify the supported invocation method.
- Confirm the SIDEXIS server and database layout.
- Create synthetic test patients.
- Document current staff workflow.

Deliverable:

- Verified interface notes.
- Final field mapping.
- Confirmed technical approach.

---

## Phase 1 — Plato API Proof of Concept

Goal: retrieve patient data safely.

Tasks:

- Create a private Git repository.
- Install Visual Studio Code or Visual Studio.
- Install the .NET SDK.
- Create a small console application.
- Store the Plato API URL and key securely.
- Call a harmless test endpoint.
- Retrieve one synthetic patient.
- Save a sanitised response for mapping.
- Add basic logs.
- Confirm rate limits and pagination.

Success criteria:

- The app authenticates successfully.
- It retrieves a test patient.
- No production patient data appears in public logs or source control.

---

## Phase 2 — SLIDA Proof of Concept

Goal: create or open one test patient in SIDEXIS.

Tasks:

- Install or locate SLIDA tools.
- Read the official examples.
- Build the smallest possible local test application.
- Send one synthetic patient record.
- Confirm the patient is created or opened correctly.
- Test names with hyphens and spaces.
- Test date-of-birth formatting.
- Record the returned SIDEXIS identifier.
- Confirm whether repeated calls create duplicates.

Success criteria:

- A synthetic patient can be opened or created through the supported SLIDA mechanism.
- A repeated call does not produce an unsafe duplicate.

---

## Phase 3 — Manual End-to-End Sync

Goal: transfer one selected patient from Plato to SIDEXIS.

Tasks:

- Retrieve one synthetic Plato patient.
- Convert it to the canonical model.
- Map it to SLIDA.
- Run the SLIDA action.
- Store the Plato-to-SIDEXIS ID relationship.
- Record an audit log.
- Display a clear result.

Success criteria:

- One test patient transfers safely.
- The ID relationship is stored.
- Errors are understandable.

---

## Phase 4 — Incremental Background Sync

Goal: automate new and updated patients.

Tasks:

- Retrieve patients changed since the last successful run.
- Add changes to the queue.
- Process the queue.
- Add retries.
- Add duplicate detection.
- Add a dead-letter queue.
- Run as a Windows service.
- Create health checks.

Success criteria:

- The service survives restarts.
- Temporary downtime does not lose jobs.
- Failed jobs are visible.
- No patient is silently duplicated.

---

## Phase 5 — Dashboard and Alerts

Goal: make the integration manageable by clinic staff.

Tasks:

- Add a local status dashboard.
- Add a review queue.
- Add email or Telegram alerts.
- Add a daily summary.
- Add a manual retry function.
- Add audit-log search.

---

## Phase 6 — Pilot Rollout

Goal: test in one controlled clinic or workstation.

Tasks:

- Back up SIDEXIS.
- Choose a pilot workstation.
- Train selected staff.
- Run in observation mode first.
- Compare Plato and SIDEXIS records.
- Track duplicates and mismatches.
- Record staff feedback.
- Create a rollback process.

Suggested rollout modes:

1. **Read-only mode**  
   Retrieve Plato records but do not write to SIDEXIS.

2. **Preview mode**  
   Show the proposed SIDEXIS action and require approval.

3. **Pilot write mode**  
   Automatically sync only selected test or newly registered patients.

4. **Production mode**  
   Automatically process all eligible patients.

---

## 15. Testing Plan

### Unit Tests

Test:

- Name normalisation.
- Date conversion.
- Identifier validation.
- Sex-value mapping.
- Patient fingerprints.
- Retry calculations.
- Deduplication logic.
- Invalid input handling.

### Integration Tests

Test:

- Plato authentication.
- Patient retrieval.
- Pagination.
- Updated-since filtering.
- SLIDA patient creation.
- SLIDA patient opening.
- SIDEXIS offline behaviour.
- Server restart behaviour.
- Duplicate-call behaviour.

### Clinical Scenario Tests

Test:

- Two patients with the same name.
- Twins with the same date of birth and surname.
- A patient who changes surname.
- A patient with no mobile number.
- A patient with a foreign ID.
- A child without an individual mobile number.
- A typo corrected in Plato.
- An existing SIDEXIS patient created before the integration.
- A patient seen at more than one clinic.
- A workstation that is offline for a day.
- A patient registered immediately before an urgent X-ray.

---

## 16. Rollback and Business Continuity

Before production:

- Back up the SIDEXIS database.
- Document how to stop the Windows service.
- Keep the existing manual workflow available.
- Make all automatic writes traceable.
- Provide a way to pause synchronisation.
- Never automatically delete SIDEXIS patients.
- Avoid automated patient merges in the first version.
- Keep a record of every create and update request.

If the integration fails:

1. Stop or pause the service.
2. Continue with the established manual patient-registration procedure.
3. Verify patient identity before imaging.
4. Preserve logs.
5. Correct the fault in a test environment.
6. Reprocess only reviewed failed jobs.

---

## 17. Suggested Repository Structure

```text
kin-integration-hub/
├── README.md
├── docs/
│   ├── architecture.md
│   ├── data-mapping.md
│   ├── deployment.md
│   ├── clinical-workflow.md
│   ├── security.md
│   └── test-plan.md
├── src/
│   ├── KinIntegration.Domain/
│   ├── KinIntegration.Plato/
│   ├── KinIntegration.Slida/
│   ├── KinIntegration.Sync/
│   ├── KinIntegration.Storage/
│   ├── KinIntegration.Service/
│   └── KinIntegration.Dashboard/
├── tests/
│   ├── KinIntegration.UnitTests/
│   └── KinIntegration.IntegrationTests/
├── scripts/
└── .gitignore
```

---

## 18. Configuration Draft

Example only:

```json
{
  "Plato": {
    "BaseUrl": "TO_BE_CONFIRMED",
    "PollingIntervalSeconds": 60,
    "ClinicId": "TO_BE_CONFIRMED"
  },
  "Sidexis": {
    "SlidaPath": "TO_BE_CONFIRMED",
    "ClinicCode": "KIN-WC"
  },
  "Sync": {
    "BatchSize": 50,
    "MaximumAttempts": 8,
    "RequireReviewForUncertainMatches": true
  },
  "Alerts": {
    "Enabled": true,
    "FailureThreshold": 5
  }
}
```

Secrets such as API keys must not be placed in this file unless securely encrypted.

---

## 19. Initial Build Strategy for a Non-Coder

The project can be built internally with AI-assisted coding, but it should be developed in small, testable stages.

Recommended sequence:

1. Learn how to open a terminal.
2. Install Git.
3. Create a private GitHub repository.
4. Install the .NET SDK.
5. Install Visual Studio Code or Visual Studio.
6. Create a basic C# console application.
7. Run a `Hello World` program.
8. Connect to a test Plato endpoint.
9. Print only sanitised patient data.
10. Obtain and study the official SLIDA documentation.
11. Build a separate SLIDA test application.
12. Create or open one synthetic patient.
13. Combine both proof-of-concept applications.
14. Add a local database.
15. Add the sync queue.
16. Convert the app into a Windows service.
17. Add the dashboard.
18. Pilot it safely.
19. Document every decision.

AI coding tools can help generate code, explain errors, write tests and review the design, but every change involving real patients should be tested and reviewed carefully.

---

## 20. First Practical Task When Resuming

The first task should be:

> Confirm and obtain the official Plato Medical API documentation and credentials, then create a small read-only C# application that retrieves one synthetic test patient.

Information needed:

- API base URL.
- Authentication method.
- Test API key or OAuth credentials.
- Patient endpoint.
- Example patient response.
- Pagination method.
- Updated-since filtering method.
- Webhook documentation, if available.
- Sandbox or test-account details.

Do not start with live automatic writes to SIDEXIS.

---

## 21. Questions to Ask Plato Medical

1. Do you provide an API for retrieving patient demographic records?
2. How is API access enabled for our clinic?
3. Is authentication done through an API key, OAuth or another method?
4. Is there a sandbox?
5. Can we retrieve patients updated after a given timestamp?
6. Do you support webhooks for patient-created and patient-updated events?
7. What is the permanent unique patient ID?
8. Are there API rate limits?
9. Is there an audit trail for API access?
10. Are there restrictions on locally developed integrations?
11. Which patient fields can be accessed?
12. Is there a support contact for integration testing?

---

## 22. Questions to Ask Dentsply Sirona or the SIDEXIS Supplier

1. Please provide the official SLIDA documentation or SDK for our installed SIDEXIS 4 version.
2. Is our SLIDA licence active?
3. What is the supported method for creating, selecting or updating a patient?
4. Can an external application provide a stable external patient ID?
5. What fields are mandatory?
6. What happens if the same patient is sent twice?
7. Can SIDEXIS return its internal patient ID?
8. Does SLIDA need to be installed on every workstation?
9. Can the integration run on the central server?
10. Are there official C# or command-line examples?
11. Is patient updating supported?
12. What are the vendor-supported duplicate-prevention rules?
13. Does the integration alter or affect the SIDEXIS warranty or support arrangement?
14. Is there a test database or test mode?

---

## 23. Long-Term Vision

Kin Integration Hub could eventually support other clinic integrations, such as:

- Patient recall workflows.
- WhatsApp communication.
- Accounting exports to Xero.
- Business-intelligence dashboards.
- Equipment tracking.
- Appointment reminders.
- Staff alerts.
- Data-quality checks.
- AI-assisted operational reporting.

However, the first release should remain deliberately narrow:

> Safely transfer patient demographics from Plato Medical to SIDEXIS 4 through SLIDA, with strong duplicate prevention, logging and human review.

---

## 24. Key Design Decisions

- Plato Medical is the master patient-demographics system.
- The initial flow is one-way.
- Patient records are never matched by name alone.
- Uncertain matches require human review.
- Automatic deletion and merging are excluded.
- The SLIDA adapter is separated from the main sync logic.
- The integration runs locally on Windows.
- A queue prevents lost updates.
- All actions are logged.
- Real patient data is not used during early development.
- A clinical identity check remains compulsory before every X-ray.

---

## 25. Current Project Status

The project is at the planning stage.

No official Plato API documentation, SLIDA documentation, test credentials or confirmed field mappings have yet been reviewed as part of this plan.

The immediate next milestone is documentation and interface verification, followed by a read-only Plato API proof of concept.

---

## 26. Resume Prompt for a Future AI Session

Copy the following into a future chat:

```text
I am continuing my Kin Dental Centre project to integrate Plato Medical with SIDEXIS 4 through Sirona SLIDA.

Plato Medical should be the single source of truth for patient demographics. I want a one-way integration from Plato to SIDEXIS, with duplicate prevention, a local Windows service, a sync queue, audit logs, retries and a manual-review queue.

I am not a coder, so guide me one step at a time. We are starting with Phase 0 and Phase 1: verify the Plato API and SLIDA documentation, then build a read-only C# proof of concept that retrieves one synthetic patient from Plato. Do not use real patient data. Help me confirm each prerequisite before generating production code.
```

---

## 27. Disclaimer

This document is an initial technical and operational design based on the discussion.

The exact implementation depends on:

- Plato Medical's official API capabilities.
- The installed SIDEXIS 4 and SLIDA versions.
- Vendor licensing.
- The clinic's actual server topology.
- Applicable privacy, healthcare and cybersecurity requirements.

No automatic production integration should be deployed until the official interfaces have been verified and the workflow has been tested using synthetic data.
