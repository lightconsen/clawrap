#!/usr/bin/env node

// OpenClaw standalone entry point
const path = require('path');
const fs = require('fs');

// Set up environment for standalone
process.env.OPENCLAW_STANDALONE = 'true';

// Find the actual openclaw module
const openclawPath = require.resolve('openclaw');

// Require and run openclaw
require('openclaw');
