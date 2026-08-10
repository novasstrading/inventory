<?php
/**
 * Nova SS Asset Manager — configuration
 * Deploy path: public_html/inventory/systems/
 */

define('DATA_DIR', __DIR__ . '/data');

// Email sender
// SECURITY: real key lives only in the live cPanel deployment — never commit it here.
define('MAIL_METHOD',   'brevo');
define('BREVO_API_KEY', 'REDACTED-SET-ON-SERVER-ONLY');
define('MAIL_FROM',      'no-reply@novasstrading.com');   // non-repliable sender
define('MAIL_FROM_NAME', 'Nova SS Asset Manager');
define('MAIL_REPLY_TO',  '');                              // empty = truly no reply-to header

// Session / OTP
define('SESSION_TTL_DAYS',   30);
define('OTP_LENGTH',          6);
define('OTP_TTL_MIN',        10);
define('OTP_RESEND_SECONDS', 60);
define('OTP_MAX_ATTEMPTS',    5);

// Sticker codes
define('CODE_PREFIX', 'NOVA');
define('CODE_PAD', 4);

$CATEGORY_CODES = [
    'Laptop'=>'LT','Desktop'=>'DT','CC Camera'=>'CC','Router'=>'RT','Switch'=>'SW',
    'Pendrive'=>'PD','Hard Drive'=>'HD','SSD'=>'SD','Dongle'=>'DG','Monitor'=>'MN',
    'Printer'=>'PR','UPS'=>'UP','Phone'=>'PH','Networking'=>'NW','Other'=>'OT',
];
$SOFTWARE_CATEGORIES = [
    'Domain','Hosting','Email Service','Subscription','License','Other Software'
];

// File uploads — photos + documents (PDF/images)
define('MAX_FILE_BYTES',  10 * 1024 * 1024);   // 10 MB per file
$ALLOWED_PHOTO_EXT = ['jpg','jpeg','png','webp','gif'];
$ALLOWED_DOC_EXT   = ['pdf','jpg','jpeg','png','webp','gif'];
