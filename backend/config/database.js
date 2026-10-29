const mongoose = require('mongoose');
const dns = require('dns');

/**
 * =========================================================================
 * 🛠️ THE COMPREHENSIVE MONGODB URI ISSUE RESOLUTION ENGINE
 * =========================================================================
 * 
 * Common Root Causes Solved Here:
 * 1. Node.js 18+ / Linux / Render DNS SRV Bug:
 *    Node.js on cloud container platforms (Render, Docker) frequently fails
 *    to resolve `mongodb+srv://` DNS SRV records (`querySrv ECONNREFUSED` / `EREFUSED`).
 *    -> Solved by explicitly setting public DNS servers (8.8.8.8, 1.1.1.1).
 * 
 * 2. Unencoded Special Characters in Passwords:
 *    Passwords containing characters like @, :, /, ?, #, [, ], %, &, +, =
 *    break standard URI parsing and cause MongoParseError or Auth failure.
 *    -> Solved by auto-sanitizing and URL-encoding credentials before connection.
 * 
 * 3. Missing Database Name in URI:
 *    Atlas connection strings copy-pasted without a database name default to
 *    'test' or create empty path segments.
 *    -> Solved by ensuring /studentDB is present in the URI or options.
 * 
 * 4. IPv6 / Network Address Translation (NAT) Routing Delays:
 *    Render containers attempting IPv6 routing first may timeout.
 *    -> Solved by passing { family: 4 } in Mongoose options.
 * 
 * 5. MongoDB Atlas Network Access (0.0.0.0/0 Whitelisting):
 *    Diagnostic interceptor prints actionable alerts if IP whitelist is blocked.
 * =========================================================================
 */

// Fix 1: Configure Node DNS to use public Google & Cloudflare resolvers for SRV lookup
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
  console.log('✅ [DNS Engine] Public DNS servers configured: [8.8.8.8, 8.8.4.4, 1.1.1.1]');
} catch (dnsErr) {
  console.warn('⚠️ [DNS Engine] Could not set custom DNS servers, using system default:', dnsErr.message);
}

/**
 * Sanitizes and repairs common MongoDB URI errors automatically.
 * @param {string} rawUri - The raw connection string from environment variable.
 * @returns {string} - Clean, URL-encoded, well-formed connection URI.
 */
function sanitizeMongoUri(rawUri) {
  if (!rawUri || typeof rawUri !== 'string') {
    throw new Error('MONGODB_URI environment variable is missing or empty!');
  }

  let uri = rawUri.trim();

  // Strip wrapping quotes if user accidentally included them in .env or Render dashboard
  if ((uri.startsWith('"') && uri.endsWith('"')) || (uri.startsWith("'") && uri.endsWith("'"))) {
    uri = uri.slice(1, -1).trim();
  }

  const srvMatch = uri.match(/^mongodb(?:\+srv)?:\/\//);
  if (!srvMatch) {
    return uri;
  }

  const prefix = srvMatch[0];
  const withoutPrefix = uri.slice(prefix.length);

  // The credentials precede the LAST '@' before the cluster host
  const lastAtIndex = withoutPrefix.lastIndexOf('@');
  if (lastAtIndex !== -1) {
    const creds = withoutPrefix.slice(0, lastAtIndex);
    const hostAndBeyond = withoutPrefix.slice(lastAtIndex + 1);

    const firstColonIndex = creds.indexOf(':');
    let username = creds;
    let password = '';

    if (firstColonIndex !== -1) {
      username = creds.slice(0, firstColonIndex);
      password = creds.slice(firstColonIndex + 1);
    }

    // Fix 2: Cleanly URL-encode username and password (handles @, #, $, %, :, +, etc.)
    const encodedUser = encodeURIComponent(decodeURIComponent(username));
    const encodedPass = encodeURIComponent(decodeURIComponent(password));

    // Split host from path and query
    const slashIndex = hostAndBeyond.indexOf('/');
    const questionIndex = hostAndBeyond.indexOf('?');

    let host = hostAndBeyond;
    let dbPath = '';
    let queryParams = '';

    if (slashIndex !== -1) {
      host = hostAndBeyond.slice(0, slashIndex);
      const afterSlash = hostAndBeyond.slice(slashIndex);
      const qIndexInAfter = afterSlash.indexOf('?');
      if (qIndexInAfter !== -1) {
        dbPath = afterSlash.slice(0, qIndexInAfter);
        queryParams = afterSlash.slice(qIndexInAfter);
      } else {
        dbPath = afterSlash;
      }
    } else if (questionIndex !== -1) {
      host = hostAndBeyond.slice(0, questionIndex);
      queryParams = hostAndBeyond.slice(questionIndex);
    }

    // Fix 3: Ensure database name 'studentDB' is explicitly present
    if (!dbPath || dbPath === '/' || dbPath === '/test') {
      dbPath = '/studentDB';
      console.log('ℹ️ [URI Engine] Target database configured to "/studentDB".');
    }

    const finalQuery = queryParams || '?retryWrites=true&w=majority';
    uri = `${prefix}${encodedUser}:${encodedPass}@${host}${dbPath}${finalQuery}`;
  }

  return uri;
}

const connectDB = async () => {
  const rawUri = process.env.MONGODB_URI;

  if (!rawUri) {
    console.error('❌ [MongoDB Error] MONGODB_URI is not set in environment variables!');
    console.error('👉 Please set MONGODB_URI in your Render environment dashboard or .env file.');
    return;
  }

  try {
    const cleanUri = sanitizeMongoUri(rawUri);

    // Mask credentials for safe logging
    const maskedUri = cleanUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    console.log(`📡 [MongoDB] Connecting to: ${maskedUri}`);

    // Mongoose connection options optimized for Render cloud environment
    const options = {
      dbName: 'studentDB',             // Explicitly guarantees studentDB is targeted
      family: 4,                       // Fix 4: Force IPv4 to prevent IPv6 DNS delays
      serverSelectionTimeoutMS: 8000,  // Fast failover if cluster is unreachable
      connectTimeoutMS: 10000,
      retryWrites: true,
      w: 'majority'
    };

    await mongoose.connect(cleanUri, options);
    console.log('🎉 [MongoDB] Successfully connected to MongoDB Atlas (Database: studentDB)!');
  } catch (error) {
    console.error('❌ [MongoDB Connection Error]:', error.message);

    // Deep diagnostic guidance based on error type
    if (error.message.includes('querySrv ECONNREFUSED') || error.message.includes('querySrv EREFUSED')) {
      console.error('\n🔍 [DIAGNOSIS: DNS SRV Lookup Failure]');
      console.error('   Your cloud provider/DNS failed to resolve the SRV record.');
      console.error('   Remedy 1: dns.setServers(["8.8.8.8", "1.1.1.1"]) is applied.');
      console.error('   Remedy 2: Use the standard 3-node connection string from Atlas (Driver 2.2.12 or earlier):');
      console.error('   Example: mongodb://user:pass@cluster-shard-00-00.mongodb.net:27017,cluster-shard-00-01.../studentDB?ssl=true&replicaSet=atlas-xxx&authSource=admin\n');
    } else if (error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
      console.error('\n🔍 [DIAGNOSIS: Authentication Failed]');
      console.error('   Remedy: Double check Atlas Database Access username & password.');
      console.error('   Ensure special characters in the password are valid or handled by our URI sanitizer.\n');
    } else if (error.message.includes('Server selection timed out') || error.message.includes('ETIMEDOUT')) {
      console.error('\n🔍 [DIAGNOSIS: IP Whitelist / Network Access Timeout]');
      console.error('   MongoDB Atlas is rejecting inbound requests from Render.');
      console.error('   Render uses dynamic IP addresses. In MongoDB Atlas:');
      console.error('   1. Go to "Network Access"');
      console.error('   2. Click "Add IP Address"');
      console.error('   3. Click "Allow Access From Anywhere" (0.0.0.0/0)');
      console.error('   4. Save and wait 60 seconds for deployment.\n');
    }

    // Do not crash the entire node process immediately; allow healthcheck endpoints to inform status
  }
};

// Event Listeners for continuous state visibility
mongoose.connection.on('connected', () => {
  console.log('⚡ [Mongoose] Connection established with database cluster.');
});

mongoose.connection.on('error', (err) => {
  console.error('⚠️ [Mongoose Error Event]:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ [Mongoose] Connection lost to MongoDB Atlas.');
});

module.exports = { connectDB, sanitizeMongoUri };
