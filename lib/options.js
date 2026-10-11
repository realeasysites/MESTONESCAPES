'use strict';

// Dropdown choices for both public forms. The HTML <select> options must match these exactly;
// anything else that gets posted is stored as empty rather than trusted.

const SERVICES = [
  'Dry stone wall (new)',
  'Old wall restoration / restack',
  'Granite steps or walkway',
  'Terrace, patio or flagging',
  'Fireplace, pillars or feature',
  'Stone sculpture or arch',
  'Something else'
];

const TIMELINES = ['This season', 'Next season', 'Within the year', 'Just planning'];

const CLIENT_TYPES = ['Homeowner', 'Landscape architect / designer', 'Builder / contractor', 'Property manager', 'Other'];

const SOURCES = ['Instagram', 'Facebook', 'Google', 'Referral / word of mouth', 'Saw your work in person', 'Landscape architect or contractor', 'The Stone Trust', 'Other'];

const POSITIONS = ['Craftsman (experienced waller)', 'Craftsman in training', 'Seasonal / laborer', 'Not sure, open to anything'];

const EXPERIENCE = ['None yet, but I want to learn', 'Landscaping or hardscaping', 'Masonry or construction', 'Dry stone walling'];

const CERTIFICATIONS = ['None', 'DSWA Initial', 'DSWA Level 1', 'DSWA Level 2', 'DSWA Level 3 or higher'];

const YES_NO = ['Yes', 'No'];

const START_DATES = ['Right away', 'Within 2 weeks', 'Within a month', 'Next season'];

const APP_SOURCES = ['Instagram', 'Facebook', 'Our website', 'A friend or crew member', 'The Stone Trust', 'Job board', 'Other'];

module.exports = { SERVICES, TIMELINES, CLIENT_TYPES, SOURCES, POSITIONS, EXPERIENCE, CERTIFICATIONS, YES_NO, START_DATES, APP_SOURCES };
