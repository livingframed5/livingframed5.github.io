/*
 * CONTRACT SCOPE TOOLKIT — SAMPLE SCOPES for instant "click and run" testing.
 *   A. dMPS industrial MSA + SOW (commercial, risk-laden)
 *   B. State Government RFP / SOW excerpt (regulatory)
 */
(function (root) {
  'use strict';

  var SAMPLE_DMPS = [
    'MASTER SERVICES AGREEMENT',
    'This Master Services Agreement ("MSA") is between PTL Industrial Solutions ("Provider") and Consolidated Manufacturing Group ("Client"). The MSA governs all Statements of Work (SOW) issued under it for managed digital-plant services (dMPS).',
    '1. TERM OF SERVICE',
    'The initial term of this Agreement shall be a period of five (5) years from the effective date, and this Agreement shall automatically renew for successive one-year terms unless either party provides written notice of its intention not to renew. The term of each SOW shall run concurrently with the same period, and each SOW shall have a minimum commitment of two (2) years.',
    '2. SERVICE LEVELS AND PENALTIES',
    'Provider shall maintain an uptime service level of 99.5% for the maintenance platforms. For any monthly service level failure, Provider shall issue a service credit equal to 5% of the applicable monthly fees for each missed service target. The Client may also require a liquidated damages payment of additional 1% of the annualized fees for any three consecutive failures.',
    '',
    '3. LIABILITY AND INDEMNITY',
    'The Provider agrees to indemnify and hold harmless Client and its officers against any and all third-party claims arising out of the performance of services under this Agreement. Liability is unlimited under this Agreement and shall not be subject to any aggregate liability cap. The Client claims will therefore not be capped to the fees paid under this Agreement. Such indemnity shall not be subject to any exclusion including for gross negligence or wilful misconduct.',
    '',
    '4. LABOR AND RATES',
    'The Provider shall render the services using dedicated staff at each Client site. All hourly rate cards are fixed and shall not increase during the term of this Agreement, and no CPI indexation or escalation clause applies. Labour rates are inclusive of all labour. Each site performs a minimum of 40 FTE hours per week. "Client acknowledges that the rates shall not be subject to upward or downward adjustment.",',
    '',
    '5. BILLING AND PAYMENT',
    'Provider shall invoice the Client in monthly installments, payable within 30 days of invoice. Implementation and platform go-live costs shall be billed upon completion, each milestone invoice due on acceptance of the milestone.',
    '',
    '6. DATA AND SECURITY',
    'Provider shall process Client data only to the extent necessary to provide the Services. Client and its personnel are located in the US and EU. Personal data protection obligations under GDPR apply. Provider shall comply with security requirements on reasonable requests.',
    '',
    '7. ASSIGNMENT',
    'Provider may engage subcontractors to deliver the Services and may assign the Agreement subject to concurrence of the Client. This Agreement is subject to the purchase orders issued under it.',
    '',
    '8. For general force conditions, the MSA includes a force majeure clause releasing both parties from performance obligations during events beyond their reasonable control.'
  ].join('\n');

  var SAMPLE_GOV = [
    'REQUEST FOR PROPOSAL — STATE TRANSPORTATION DEPARTMENT',
    'Statement of Work and terms for the Modernization of Field Service Management Platforms (FSM).',
    '1. SCOPE OF CONTRACT',
    'This RFP solicits solutions for a managed field-service platform operating under the State of Ohio Transportation Authority ("the Authority"). Orders are placed under the agile procurement vehicle per the State\'s standing SOW. The contract is subject to the State Important Procedures and the FAR-based terms and conditions.',
    '',
    '2. CLIN STRUCTURE AND ORDERING',
    'All services shall be ordered and charged on a time-and-materials CLIN (CLIN 001) and a unit-price CLIN (CLIN 002). Each order will reference the ACRN and contract line item number for accurate billing. Invoice referencing the CLIN is mandatory to record the order to a cost pool.',
    '',
    '3. TERM',
    'The initial term is three (3) years with three (3) one-year renewal option periods exercised at the State\'s discretion.',
    '',
    '4. SECURITY AND RESIDENCY',
    'Provider must state how services are rendered and where data is processed. All Client data shall be processed and stored in the United States only, no data movement offshore. Provider shall ensure compliance with the ADA/VRS for federal accessibility, and true NIST SP 800-171 controls plus CMMC requirements for the sensitive configuration. Make vendor and onshore "data residency" states on the data-processing annex.',
    '',
    '5. LABOR AND PRICING',
    'Labor rates are a fixed ceiling per year with annual escalation tied to the Consumer Price Index (CPI), and the State reserves the right to audit and verify burdened labor rates directly resulting from cost discovery.',
    '',
    '6. ORDER FLOW',
    'The Authority issues task orders that reference a defined CLIN. Please place a record of the bound commitment within the contract; the accounts payable system validates each invoice against the CLIN before payment is authorized. This contract is subject to invoicing align to the CLIN for bookings.'
  ].join('\n');

  var SAMPLES = {
    dmps: {
      name: 'dMPS MSA + SOW (commercial, risk-heavy)',
      pursuit: 'Q3 Industrial Transformation – Chicago plant',
      region: 'US-East', acv: '$1.2M', govPursuit: false,
      customRules: ['debt ratio', 'over burn', 'no exclusivity', 'F&B rates'].concat(['discount', 'regional']),
      text: SAMPLE_DMPS
    },
    gov: {
      name: 'State Gov RFP / SOW (federal-style)',
      pursuit: 'Ohio Transportation Digital Services',
      region: 'US-Midwest', acv: '$8.4M', govPursuit: true,
      customRules: ['oversite', 'CIO sign-off', 'data residency', 'invalid CLIN'],
      text: SAMPLE_GOV
    }
  };

  root.ContractScope = root.ContractScope || {};
  root.ContractScope.SAMPLES = SAMPLES;
})(typeof window !== 'undefined' ? window : globalThis);