const util = require('util');
const base64url = require('base64url');
const crypto = require('crypto');


exports.sign = function jwsSign() {
  if (arguments.length === 2) {
    var payload = arguments[0];
    const secretOrKey = arguments[1].toString();
    const header = { };
    if (typeof payload === 'object')
      payload = JSON.stringify(payload);
    if (isPrivateKey(secretOrKey))
      return jwsRS256Sign(header, payload, secretOrKey);
    return jwsHS256Sign(header, payload, secretOrKey);
  }
}

function jwsSecuredInput(header, payload) {
  const encodedHeader = base64url(header);
  const encodedPayload = base64url(payload);
  return util.format('%s.%s', encodedHeader, encodedPayload);
}

function isPrivateKey(secretOrKey) {
  const RSA_INDICATOR = '-----BEGIN RSA PRIVATE KEY-----';
  return secretOrKey.indexOf(RSA_INDICATOR) === 0;
}

function jwsRS256Sign(header, payload, key) {
  header.alg = 'RS256';
  header = JSON.stringify(header);
  const signature = createRS256Signature(header, payload, key);
  return jwsOutput(header, payload, signature);
}

function createRS256Signature(header, payload, key) {
  const signer = crypto.createSign('RSA-SHA256', key);
  const securedInput = jwsSecuredInput(header, payload);
  const signature = (signer.update(securedInput), signer.sign(key, 'base64'));
  return base64url.fromBase64(signature);
}

function jwsHS256Sign(header, payload, secret) {
  header.alg = 'HS256';
  header = JSON.stringify(header);
  const signature = createHS256Signature(header, payload, secret);
  return jwsOutput(header, payload, signature);
}

function createHS256Signature(header, payload, secret) {
  const hmac = crypto.createHmac('SHA256', secret);
  const securedInput = jwsSecuredInput(header, payload);
  const signature = (hmac.update(securedInput), hmac.digest('base64'));
  return base64url.fromBase64(signature);
}

function jwsOutput(header, payload, signature) {
  return util.format(
    '%s.%s.%s',
    base64url(header),
    base64url(payload),
    signature);
}

exports.verify = function jwsVerify(jwsObject, secretOrKey) {
  const parts = jwsObject.split('.');
  const encodedHeader = parts[0];
  const encodedPayload = parts[1];
  const encodedSignature = parts[2];
  const rawHeader = base64url.decode(encodedHeader);
  const payload = base64url.decode(encodedPayload);
  const header = JSON.parse(rawHeader);
  const verifiers = {
    HS256: jwsHS256Verify,
    RS256: jwsRS256Verify
  };
  const verifierFn = verifiers[header.alg];
  return verifierFn(rawHeader, payload, secretOrKey, encodedSignature)
}

function jwsHS256Verify(header, payload, secret, expectedSignature) {
  const calculatedSignature =
    createHS256Signature(header, payload, secret);
  return expectedSignature === calculatedSignature;
}

function jwsRS256Verify(header, payload, publicKey, signature) {
  const verifier = crypto.createVerify('RSA-SHA256');
  const securedInput = jwsSecuredInput(header, payload);
  signature = base64url.toBase64(signature);
  verifier.update(securedInput);
  return verifier.verify(publicKey, signature, 'base64');
}