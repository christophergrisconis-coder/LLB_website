export interface LegalTemplate {
  id: string;
  category: 'motions' | 'discovery' | 'intake' | 'sentencing';
  categoryLabel: string;
  title: string;
  subtitle: string;
  statutoryBasis: string;
  description: string;
  estimatedTime: string;
  image: string;
  imageAlt: string;
  fields: {
    key: string;
    label: string;
    placeholder: string;
    defaultValue?: string;
    type?: 'text' | 'textarea' | 'date';
  }[];
  contentTemplate: (data: Record<string, string>) => string;
}

export const LEGAL_TEMPLATES: LegalTemplate[] = [
  // ─── 1. CRIMINAL DEFENSE & MOTIONS ─────────────────────────────
  {
    id: 'motion-to-suppress',
    category: 'motions',
    categoryLabel: 'Courtroom Motions',
    title: 'Motion to Suppress Evidence (4th Amendment)',
    subtitle: 'Unlawful search, seizure, prolonged stop, or lack of reasonable articulable suspicion',
    statutoryBasis: 'U.S. Const. amends. IV, XIV; N.C. Gen. Stat. § 15A-974 / 4th Cir. Precedent',
    description: 'Formal motion seeking exclusion of physical evidence and statements obtained in violation of constitutional protections against warrantless searches.',
    estimatedTime: '8 min drafting',
    image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Law books and gavel on polished mahogany courtroom desk',
    fields: [
      { key: 'state', label: 'State / Jurisdiction', placeholder: 'e.g. North Carolina', defaultValue: 'North Carolina' },
      { key: 'county', label: 'County / District', placeholder: 'e.g. Wake County', defaultValue: 'Wake County' },
      { key: 'court', label: 'Court Name', placeholder: 'e.g. Superior Court Division', defaultValue: 'Superior Court Division' },
      { key: 'fileNumber', label: 'Case / File No.', placeholder: 'e.g. 26-CRS-008941', defaultValue: '26-CRS-008941' },
      { key: 'defendant', label: 'Defendant Full Name', placeholder: 'e.g. Marcus Vance', defaultValue: 'Marcus Vance' },
      { key: 'attorney', label: 'Defense Counsel Name', placeholder: 'e.g. Christopher Grisconis, Esq.', defaultValue: 'Christopher Grisconis, Esq.' },
      { key: 'firmName', label: 'Firm Name', placeholder: 'e.g. Vance & Grisconis Law Group, PLLC', defaultValue: 'Vance & Grisconis Law Group, PLLC' },
      { key: 'officerName', label: 'Arresting Officer / Agency', placeholder: 'e.g. Officer J. Davis, City Police Dept', defaultValue: 'Officer J. Davis, City Police Dept' },
      { key: 'grounds', label: 'Specific Factual Grounds for Suppression', placeholder: 'Describe unlawful stop, prolonged detention, or lack of warrant...', type: 'textarea', defaultValue: 'The arresting officer lacked reasonable, articulable suspicion to prolong the traffic stop beyond its initial purpose to conduct an unauthorized K-9 sniff, violating the fourth amendment standard set forth in Rodriguez v. United States and Fourth Circuit precedent.' }
    ],
    contentTemplate: (d) => `STATE OF ${d.state?.toUpperCase() || 'NORTH CAROLINA'}
COUNTY OF ${d.county?.toUpperCase() || 'WAKE'}
IN THE GENERAL COURT OF JUSTICE
${d.court?.toUpperCase() || 'SUPERIOR COURT DIVISION'}
FILE NO: ${d.fileNumber || '26-CRS-XXXXXX'}

STATE OF ${d.state?.toUpperCase() || 'NORTH CAROLINA'}
    v.
${d.defendant?.toUpperCase() || 'DEFENDANT NAME'},
    Defendant.

================================================================================
                    MOTION TO SUPPRESS EVIDENCE
    (U.S. CONST. AMENDS. IV, XIV; STATUTORY EXCLUSIONARY MANDATE)
================================================================================

NOW COMES the Defendant, ${d.defendant || '[Defendant]'}, by and through undersigned counsel, ${d.attorney || '[Attorney]'} of ${d.firmName || '[Firm Name]'}, pursuant to the Fourth and Fourteenth Amendments to the United States Constitution, and the laws of this State, and respectfully moves this Honorable Court for an Order suppressing any and all evidence seized, observed, or derived from the unlawful stop and search of the Defendant.

IN SUPPORT of this Motion, Defendant shows the Court the following:

1. On or about the date of arrest, law enforcement officer(s), specifically ${d.officerName || '[Officer/Agency]'}, initiated an investigatory stop and subsequent search of Defendant's person, vehicle, or premises.

2. Factual Basis for Suppression:
${d.grounds || '[Factual Grounds Inserted Here]'}

3. The warrantless seizure and detention of Defendant was conducted without reasonable, articulable suspicion of criminal activity, without probable cause, and without voluntary and informed consent.

4. Any evidence seized, including physical items, statements, and observations, constitutes fruit of the poisonous tree under Wong Sun v. United States, 371 U.S. 471 (1963), and must be suppressed.

WHEREFORE, Defendant respectfully prays that this Court:
1. Conduct an evidentiary hearing on this Motion;
2. Enter an Order suppressing all evidence obtained as a result of the unlawful search and seizure;
3. Grant such other and further relief as the Court deems just and proper.

Respectfully submitted this _____ day of _______________, 2026.

___________________________________________
${d.attorney || '[Attorney Name]'}
Counsel for Defendant
${d.firmName || '[Firm Name]'}
`
  },
  {
    id: 'notice-of-appearance-discovery',
    category: 'motions',
    categoryLabel: 'Courtroom Motions',
    title: 'Notice of Appearance & Request for Discovery',
    subtitle: 'Formal entry of representation with comprehensive Brady/Giglio/Rule 16 demand',
    statutoryBasis: 'Brady v. Maryland, 373 U.S. 83; Giglio v. United States; Fed. R. Crim. P. 16',
    description: 'Initial pleading filed to enter appearance on the docket and demand immediate production of all state and exculpatory evidence.',
    estimatedTime: '5 min drafting',
    image: 'https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Legal briefs and courtroom documents neatly organized',
    fields: [
      { key: 'state', label: 'State / Jurisdiction', placeholder: 'e.g. North Carolina', defaultValue: 'North Carolina' },
      { key: 'county', label: 'County / District', placeholder: 'e.g. Mecklenburg County', defaultValue: 'Mecklenburg County' },
      { key: 'fileNumber', label: 'Case Number', placeholder: 'e.g. 26-CRS-014522', defaultValue: '26-CRS-014522' },
      { key: 'defendant', label: 'Defendant Name', placeholder: 'e.g. Aaron Jenkins', defaultValue: 'Aaron Jenkins' },
      { key: 'attorney', label: 'Defense Attorney', placeholder: 'e.g. Chris Grisconis, Esq.', defaultValue: 'Chris Grisconis, Esq.' },
      { key: 'firmName', label: 'Law Firm', placeholder: 'e.g. Advanced Legal Defense, PLLC', defaultValue: 'Advanced Legal Defense, PLLC' }
    ],
    contentTemplate: (d) => `STATE OF ${d.state?.toUpperCase() || 'NORTH CAROLINA'}
COUNTY OF ${d.county?.toUpperCase() || 'MECKLENBURG'}
IN THE GENERAL COURT OF JUSTICE
FILE NO: ${d.fileNumber || '26-CRS-XXXXXX'}

STATE OF ${d.state?.toUpperCase() || 'NORTH CAROLINA'}
    v.
${d.defendant?.toUpperCase() || 'DEFENDANT NAME'},
    Defendant.

================================================================================
            ENTRY OF APPEARANCE & FORMAL DISCOVERY DEMAND
================================================================================

TO THE CLERK OF COURT AND THE DISTRICT ATTORNEY / PROSECUTOR:

PLEASE TAKE NOTICE that undersigned counsel, ${d.attorney || '[Attorney]'}, hereby enters an appearance as attorney of record for the Defendant, ${d.defendant || '[Defendant]'}, in the above-captioned matter.

DEFENDANT HEREBY DEMANDS that the State disclose and provide complete discovery within the statutory deadline, including but not limited to:
1. All written, recorded, or oral statements made by the Defendant;
2. Complete law enforcement incident reports, investigative summaries, and officer field notes;
3. All body-worn camera (BWC), dashcam, 911 audio recordings, and surveillance video;
4. Full criminal records of all prospective prosecution witnesses;
5. All exculpatory and impeachment material under Brady v. Maryland and Giglio v. United States;
6. All expert witness qualifications, laboratory testing notes, and bench sheets.

Dated: _______________, 2026.

___________________________________________
${d.attorney || '[Attorney Name]'}
${d.firmName || '[Firm Name]'}
`
  },
  {
    id: 'motion-for-continuance',
    category: 'motions',
    categoryLabel: 'Courtroom Motions',
    title: 'Motion for Continuance / Extension of Time',
    subtitle: 'Rescheduling hearing or trial calendar for discovery review or unavailable witness',
    statutoryBasis: 'Rules of Practice; Sixth Amendment Right to Effective Assistance of Counsel',
    description: 'Paralegal and attorney standard motion requesting postponement of upcoming court calendar dates to preserve client due process.',
    estimatedTime: '4 min drafting',
    image: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Calendar and courtroom docket schedule on wooden desk',
    fields: [
      { key: 'county', label: 'County', placeholder: 'e.g. Durham County', defaultValue: 'Durham County' },
      { key: 'fileNumber', label: 'Case Number', placeholder: 'e.g. 26-CR-003819', defaultValue: '26-CR-003819' },
      { key: 'defendant', label: 'Defendant Name', placeholder: 'e.g. Michael Thorne', defaultValue: 'Michael Thorne' },
      { key: 'currentDate', label: 'Current Setting Date', placeholder: 'e.g. September 14, 2026', defaultValue: 'September 14, 2026' },
      { key: 'reason', label: 'Reason for Continuance', placeholder: 'e.g. Outstanding forensic lab discovery and unavailable defense expert', defaultValue: 'Outstanding forensic ballistic discovery from the State Crime Lab has not been produced, and defense expert requires 30 days to review materials.' },
      { key: 'attorney', label: 'Counsel Name', placeholder: 'e.g. Nora Bell, Esq.', defaultValue: 'Nora Bell, Esq.' }
    ],
    contentTemplate: (d) => `IN THE GENERAL COURT OF JUSTICE
COUNTY OF ${d.county?.toUpperCase() || 'DURHAM'}
FILE NO: ${d.fileNumber || '26-CR-XXXXXX'}

STATE v. ${d.defendant?.toUpperCase() || 'DEFENDANT'}

================================================================================
                    MOTION FOR CONTINUANCE
================================================================================

Defendant respectfully moves this Court to continue the matter currently scheduled for ${d.currentDate || '[Current Date]'}, showing good cause:

1. ${d.reason || '[Reason for continuance]'}
2. This request is made in good faith and not for the purpose of undue delay.
3. The constitutional rights of the Defendant to effective assistance of counsel require reasonable time to prepare.

WHEREFORE, Defendant prays the Court continue this matter to the next available administrative calendar.

Date: _______________, 2026.

___________________________________________
${d.attorney || '[Attorney Signature]'}
`
  },
  {
    id: 'motion-for-bond-reduction',
    category: 'motions',
    categoryLabel: 'Courtroom Motions',
    title: 'Motion for Bond Reduction & Pretrial Modification',
    subtitle: 'Securing reasonable pretrial release conditions and community supervision',
    statutoryBasis: 'U.S. Const. amend. VIII; Statutory Pretrial Release Standards',
    description: 'Motion arguing against excessive bail and establishing non-monetary release terms, family ties, and stable community employment.',
    estimatedTime: '6 min drafting',
    image: 'https://images.unsplash.com/photo-1589994965851-a8f479c573a9?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Scales of justice illuminated in dark moody editorial lighting',
    fields: [
      { key: 'fileNumber', label: 'Case Number', defaultValue: '26-CRS-091234' },
      { key: 'defendant', label: 'Defendant Name', defaultValue: 'Jordan Hayes' },
      { key: 'currentBond', label: 'Current Bond Amount', defaultValue: '$250,000 Secured' },
      { key: 'requestedBond', label: 'Requested Release Conditions', defaultValue: '$25,000 Unsecured with Pretrial Electronic Monitoring' },
      { key: 'ties', label: 'Community Ties & Employment', type: 'textarea', defaultValue: 'Defendant has resided in the county for 18 years, is gainfully employed full-time, supports two minor dependents, and poses zero flight risk or threat to the public.' }
    ],
    contentTemplate: (d) => `STATE OF NORTH CAROLINA
IN THE GENERAL COURT OF JUSTICE
FILE NO: ${d.fileNumber || '26-CRS-XXXXXX'}

STATE v. ${d.defendant?.toUpperCase() || 'DEFENDANT'}

================================================================================
            MOTION FOR BOND REDUCTION & RELEASE MODIFICATION
================================================================================

Defendant moves the Court to modify current pretrial release conditions:

1. Defendant is presently detained under a ${d.currentBond || '$250,000 Secured'} bond, which operates as de facto preventative detention in violation of the Eighth Amendment.
2. Defendant shows substantial community ties:
${d.ties || '[Community Ties]'}
3. Defendant requests release under ${d.requestedBond || 'Unsecured Bond and Electronic Monitoring'}.

WHEREFORE, Defendant prays the Court grant a bond reduction hearing and order reasonable release terms.
`
  },

  // ─── 2. DISCOVERY & SUBPOENAS ──────────────────────────────────
  {
    id: 'subpoena-duces-tecum',
    category: 'discovery',
    categoryLabel: 'Discovery & Evidence',
    title: 'Subpoena Duces Tecum (Third-Party Records Custodian)',
    subtitle: 'Compelling production of surveillance video, hospital charts, or cellular tower logs',
    statutoryBasis: 'Fed. R. Crim. P. 17(c); State Civil & Criminal Rules of Procedure',
    description: 'Formal court command served upon corporate or medical entities to produce non-party records prior to evidentiary hearing.',
    estimatedTime: '7 min drafting',
    image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Fountain pen resting on legal discovery affidavit',
    fields: [
      { key: 'targetEntity', label: 'Custodian / Entity Name', placeholder: 'e.g. Regional Medical Center / Records Dept', defaultValue: 'Regional Medical Center - Health Information Dept' },
      { key: 'targetAddress', label: 'Entity Address', placeholder: 'e.g. 100 Hospital Way, Suite 400', defaultValue: '100 Hospital Plaza, Medical District' },
      { key: 'itemsRequested', label: 'Records Commanded for Production', type: 'textarea', defaultValue: 'Certified, complete medical and diagnostic records, toxicology screens, nursing intake charts, and physician progress notes for patient John Doe, DOB 05/12/1988, for dates of service spanning January 1, 2026 to present.' },
      { key: 'dueDate', label: 'Production Deadline Date', defaultValue: 'October 15, 2026' }
    ],
    contentTemplate: (d) => `SUBPOENA DUCES TECUM
STATE OF NORTH CAROLINA / 4TH CIRCUIT

TO: Custodian of Records
    ${d.targetEntity || '[Entity Name]'}
    ${d.targetAddress || '[Entity Address]'}

YOU ARE HEREBY COMMANDED to produce and deliver true and certified copies of the following tangible records on or before ${d.dueDate || '[Date]'}:

ITEMS COMMANDED:
${d.itemsRequested || '[List of Items]'}

FAILURE TO COMPLY with this Subpoena may subject you to contempt of Court and statutory penalties.
`
  },
  {
    id: 'standard-interrogatories',
    category: 'discovery',
    categoryLabel: 'Discovery & Evidence',
    title: 'First Set of Pattern Interrogatories',
    subtitle: 'Standardized discovery questions served on opposing party under oath',
    statutoryBasis: 'N.C. R. Civ. P. 33; Fed. R. Civ. P. 33',
    description: 'Comprehensive written questions forcing the opposing party to disclose all known witnesses, facts, insurance policies, and damages calculations.',
    estimatedTime: '10 min drafting',
    image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Business litigation partners reviewing deposition questions',
    fields: [
      { key: 'plaintiff', label: 'Plaintiff Name', defaultValue: 'Jane Doe' },
      { key: 'defendant', label: 'Defendant Name', defaultValue: 'Acme Logistics Corp' },
      { key: 'court', label: 'Court & County', defaultValue: 'Superior Court of Wake County' },
      { key: 'numDays', label: 'Response Period', defaultValue: '30 Days' }
    ],
    contentTemplate: (d) => `IN THE ${d.court?.toUpperCase() || 'SUPERIOR COURT'}

${d.plaintiff?.toUpperCase() || 'PLAINTIFF'},
    Plaintiff,
v.
${d.defendant?.toUpperCase() || 'DEFENDANT'},
    Defendant.

FIRST SET OF WRITTEN INTERROGATORIES TO DEFENDANT

Pursuant to Rule 33, Plaintiff propounds the following Interrogatories to be answered under oath within ${d.numDays || '30 days'}:

INTERROGATORY 1: State the full name, home address, employer, and title of every individual who assisted in preparing answers to these Interrogatories.
INTERROGATORY 2: Identify every eyewitness to the incident, including names, telephone numbers, and last known addresses.
INTERROGATORY 3: Describe in granular factual detail your version of the incident referenced in the Complaint.
INTERROGATORY 4: State all liability and excess insurance policies applicable to the claims herein, including policy limits.
`
  },
  {
    id: 'privilege-log',
    category: 'discovery',
    categoryLabel: 'Discovery & Evidence',
    title: 'Litigation Privilege Log Matrix',
    subtitle: 'Index of documents withheld under Attorney-Client and Work-Product Privilege',
    statutoryBasis: 'Fed. R. Civ. P. 26(b)(5); Upjohn Co. v. United States',
    description: 'Standardized table cataloging date, author, recipient, document type, and legal privilege basis for all withheld discovery items.',
    estimatedTime: '5 min drafting',
    image: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Document stamps and confidential files',
    fields: [
      { key: 'caseCaption', label: 'Case Caption', defaultValue: 'Vance v. State Department of Public Safety' },
      { key: 'firmName', label: 'Responding Firm', defaultValue: 'Vance & Partners, LLP' }
    ],
    contentTemplate: (d) => `DEFENDANT'S PRIVILEGE LOG INDEX
CASE: ${d.caseCaption || '[Case Caption]'}
PREPARED BY: ${d.firmName || '[Firm Name]'}

========================================================================================================
DOC ID | DATE       | AUTHOR           | RECIPIENT        | TYPE     | PRIVILEGE ASSERTED & BASIS
========================================================================================================
001    | 02/14/2026 | J. Vance, Esq.   | Client           | Email    | Attorney-Client: Legal Strategy
002    | 02/18/2026 | Investigator R.  | Lead Counsel     | Memo     | Work-Product: Witness Assessment
003    | 03/01/2026 | Lead Counsel     | Litigation File  | Notes    | Opinion Work-Product: Trial Outline
========================================================================================================
`
  },

  // ─── 3. CLIENT INTAKE & PRACTICE MANAGEMENT ───────────────────
  {
    id: 'client-engagement-agreement',
    category: 'intake',
    categoryLabel: 'Client Intake & Retainers',
    title: 'Legal Representation Retainer Agreement',
    subtitle: 'Standardized fee agreement, scope of work, trust accounting, and withdrawal terms',
    statutoryBasis: 'State Bar Rules of Professional Conduct (Rule 1.5 Fees & Trust Account)',
    description: 'Binding attorney-client engagement contract defining fee structures (flat/hourly), non-refundable retainers, and client responsibilities.',
    estimatedTime: '5 min drafting',
    image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Signing contract with luxury fountain pen in dim executive office',
    fields: [
      { key: 'clientName', label: 'Client Full Name', defaultValue: 'Elena Rostova' },
      { key: 'scope', label: 'Scope of Representation', defaultValue: 'Representation in Wake County District and Superior Court criminal matter 26-CRS-100293 through trial or plea disposition.' },
      { key: 'feeType', label: 'Fee Structure', defaultValue: 'Flat Fee of $7,500.00' },
      { key: 'attorney', label: 'Lead Attorney', defaultValue: 'Marcus Vance, Senior Partner' }
    ],
    contentTemplate: (d) => `ATTORNEY-CLIENT ENGAGEMENT & FEE AGREEMENT

This Agreement is entered into between ${d.clientName || '[Client Name]'} ("Client") and Vance & Partners, PLLC ("Firm"), with ${d.attorney || '[Attorney]'} designated as lead counsel.

1. SCOPE OF SERVICES:
${d.scope || '[Scope Description]'}

2. FINANCIAL TERMS & RETAINER:
Client agrees to pay the Firm a ${d.feeType || 'Flat Fee of $7,500'}. Funds shall be deposited into the Firm's IOLTA trust account and earned upon completion of agreed milestones.

3. CLIENT RESPONSIBILITIES:
Client shall maintain active contact, inform the Firm of address changes, and attend all scheduled court dates.

4. TERMINATION OF REPRESENTATION:
Either party may terminate representation upon written notice consistent with State Bar ethics rules.

ACCEPTED AND AGREED:

Client Signature: _______________________ Date: ____________
Attorney Signature: _____________________ Date: ____________
`
  },
  {
    id: 'hipaa-release',
    category: 'intake',
    categoryLabel: 'Client Intake & Retainers',
    title: 'HIPAA Medical Records & Billing Authorization',
    subtitle: '45 C.F.R. § 164.508 compliant release for health records and billing statements',
    statutoryBasis: 'Health Insurance Portability and Accountability Act of 1996 (HIPAA)',
    description: 'Mandatory patient waiver enabling legal counsel to obtain complete, confidential hospital charts, surgical notes, and billing records.',
    estimatedTime: '3 min drafting',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Medical clipboard and stethoscope on clinical table',
    fields: [
      { key: 'patientName', label: 'Patient Name', defaultValue: 'David Miller' },
      { key: 'dob', label: 'Date of Birth', defaultValue: '11/04/1984' },
      { key: 'ssnLast4', label: 'SSN (Last 4)', defaultValue: '9821' },
      { key: 'lawFirm', label: 'Authorized Law Firm', defaultValue: 'Lawyers Legal Beef / Vance Defense PLLC' }
    ],
    contentTemplate: (d) => `AUTHORIZATION FOR RELEASE OF HEALTH INFORMATION (HIPAA)
PURSUANT TO 45 C.F.R. § 164.508

PATIENT NAME: ${d.patientName || '[Patient Name]'}
DATE OF BIRTH: ${d.dob || '[DOB]'}  |  SSN (LAST 4): ${d.ssnLast4 || 'XXXX'}

1. I HEREBY AUTHORIZE any hospital, clinic, physician, or billing provider to disclose and release my complete medical records, billing statements, and treatment notes to:
${d.lawFirm || '[Law Firm Name]'}

2. PURPOSE: Legal evaluation and defense representation.
3. EXPIRATION: This authorization expires 12 months from the date of execution.

Patient Signature: _________________________________ Date: _______________
`
  },
  {
    id: 'non-engagement-letter',
    category: 'intake',
    categoryLabel: 'Client Intake & Retainers',
    title: 'Formal Non-Engagement / Declination Letter',
    subtitle: 'Malpractice defense letter confirming that representation was not accepted',
    statutoryBasis: 'State Bar Formal Ethics Opinions on Statute of Limitations Warnings',
    description: 'Critical protective correspondence sent to prospective clients confirming that no attorney-client relationship exists and warning of statute of limitations.',
    estimatedTime: '3 min drafting',
    image: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Formal letter in wax-sealed envelope on desk',
    fields: [
      { key: 'prospectName', label: 'Prospective Client', defaultValue: 'Robert Henderson' },
      { key: 'matterType', label: 'Matter Inquired About', defaultValue: 'Commercial breach of contract dispute' },
      { key: 'firmName', label: 'Firm Name', defaultValue: 'Vance & Partners, PLLC' }
    ],
    contentTemplate: (d) => `CONFIDENTIAL CORRESPONDENCE

RE: Non-Engagement Notice Regarding ${d.matterType || '[Matter Type]'}

Dear ${d.prospectName || '[Prospective Client]'},

Thank you for contacting ${d.firmName || '[Firm Name]'}. Following our preliminary discussion, we regret to inform you that our firm is unable to accept representation in this matter.

IMPORTANT STATUTE OF LIMITATIONS WARNING:
Legal claims are subject to strict statutory deadlines (Statutes of Limitations). Failure to file appropriate court pleadings prior to the expiration of these deadlines will permanently extinguish your legal rights. Because we do not represent you, we cannot advise you on the specific deadline governing your claim. We strongly urge you to consult another attorney immediately.

Sincerely,
${d.firmName || '[Firm Name]'}
`
  },

  // ─── 4. SENTENCING & POST-CONVICTION ───────────────────────────
  {
    id: 'sentencing-mitigation-memo',
    category: 'sentencing',
    categoryLabel: 'Sentencing & Post-Conviction',
    title: 'Sentencing Mitigation Memorandum',
    subtitle: 'Comprehensive biographical brief, mitigating factors, and alternative sentencing proposal',
    statutoryBasis: '18 U.S.C. § 3553(a); State Structured Sentencing Act Statutory Mitigators',
    description: 'High-impact sentencing brief presenting the human story, rehabilitation evidence, military service, and downward variance grounds to the presiding judge.',
    estimatedTime: '15 min drafting',
    image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Courtroom defense brief before the bench in dramatic lighting',
    fields: [
      { key: 'judge', label: 'Presiding Judge', defaultValue: 'The Honorable Judge S. Robinson' },
      { key: 'defendant', label: 'Defendant Full Name', defaultValue: 'Carlos Mendez' },
      { key: 'fileNumber', label: 'File Number', defaultValue: '26-CRS-004412' },
      { key: 'mitigators', label: 'Key Mitigating Factors', type: 'textarea', defaultValue: '1. Defendant has maintained continuous gainful employment for six consecutive years.\n2. Defendant successfully completed 120 hours of voluntary substance treatment prior to plea.\n3. Defendant is the sole financial caregiver for elderly parents.\n4. Honorable discharge from military service.' },
      { key: 'recommendation', label: 'Defense Sentencing Recommendation', defaultValue: 'Probationary term with community service in lieu of active incarceration.' }
    ],
    contentTemplate: (d) => `STATE OF NORTH CAROLINA
IN THE GENERAL COURT OF JUSTICE
FILE NO: ${d.fileNumber || '26-CRS-XXXXXX'}

STATE v. ${d.defendant?.toUpperCase() || 'DEFENDANT'}

================================================================================
                    DEFENDANT'S SENTENCING MEMORANDUM
================================================================================

TO: ${d.judge?.toUpperCase() || 'THE HONORABLE PRESIDING JUDGE'}

COMES NOW Defendant ${d.defendant || '[Defendant]'}, by and through counsel, and respectfully submits this Sentencing Memorandum to assist the Court in fashioning a just and individualized sentence.

I. STATUTORY MITIGATING FACTORS PROVEN BY DEFENSE:
${d.mitigators || '[Mitigating Factors]'}

II. REHABILITATIVE EFFORTS & CHARACTER EVIDENCE:
Defendant has demonstrated extraordinary remorse and proactive steps toward rehabilitation. Attached hereto as Exhibit A through D are character references from community leaders, employers, and family members.

III. PROPOSED SENTENCE:
Defendant respectfully requests that the Court enter a ${d.recommendation || 'Probationary Sentence'} consistent with justice and proportionality.
`
  },
  {
    id: 'motion-early-termination-probation',
    category: 'sentencing',
    categoryLabel: 'Sentencing & Post-Conviction',
    title: 'Motion for Early Termination of Probation',
    subtitle: 'Relief from supervision following substantial compliance and payment of restitution',
    statutoryBasis: 'N.C. Gen. Stat. § 15A-1344; 18 U.S.C. § 3564(c)',
    description: 'Motion establishing client compliance with all probation conditions, full restitution payment, and clean behavioral record to terminate supervision early.',
    estimatedTime: '5 min drafting',
    image: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'City courthouse bathed in twilight cinematic blue lighting',
    fields: [
      { key: 'defendant', label: 'Probationer Name', defaultValue: 'Marcus Holloway' },
      { key: 'monthsServed', label: 'Months Completed', defaultValue: '18 of 24 months' },
      { key: 'restitutionPaid', label: 'Restitution Status', defaultValue: '100% Paid in Full ($4,200.00)' },
      { key: 'officerStance', label: 'Probation Officer Stance', defaultValue: 'Probation Officer has expressed no objection to early discharge.' }
    ],
    contentTemplate: (d) => `IN THE GENERAL COURT OF JUSTICE
FILE NO: 24-CRS-088192

STATE v. ${d.defendant?.toUpperCase() || 'PROBATIONER'}

================================================================================
            MOTION FOR EARLY TERMINATION OF SUPERVISED PROBATION
================================================================================

Defendant respectfully requests the Court enter an Order terminating probation:

1. Defendant has completed ${d.monthsServed || '18 of 24 months'} of supervised probation without any reported violations.
2. All financial obligations, court costs, and restitution are ${d.restitutionPaid || '100% Paid in Full'}.
3. ${d.officerStance || 'Probation officer does not oppose early termination.'}

WHEREFORE, Defendant prays the Court terminate supervision and release Defendant from all further probation obligations.
`
  }
];
