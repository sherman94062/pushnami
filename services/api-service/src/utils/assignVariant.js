const crypto = require('crypto');

/**
 * Deterministically assign a visitor to a variant based on a hash
 * of visitor_id + experiment_id. Same inputs always produce the same output.
 */
function assignVariant(visitorId, experimentId, variants) {
  const hash = crypto
    .createHash('md5')
    .update(`${visitorId}:${experimentId}`)
    .digest('hex');

  // Convert first 8 hex chars to a number in [0, 1)
  const hashValue = parseInt(hash.substring(0, 8), 16) / 0xffffffff;

  // Normalize weights
  const totalWeight = variants.reduce(
    (sum, v) => sum + parseFloat(v.weight),
    0
  );

  let cumulative = 0;
  for (const variant of variants) {
    cumulative += parseFloat(variant.weight) / totalWeight;
    if (hashValue < cumulative) {
      return variant;
    }
  }

  return variants[variants.length - 1];
}

module.exports = { assignVariant };
