<?php
/**
 * Nova SS Asset Manager — authorized logins
 * -----------------------------------------
 * ONLY people listed here can request a login code and sign in.
 * This is the single place admins are defined. To add, remove, or change an
 * admin, edit THIS file on the server (cPanel File Manager) and save.
 *
 * Format:  'email' => 'role'
 * Roles are informational for now ('admin'); everyone listed has full access.
 * Emails are matched case-insensitively.
 */

return [
    'it-support@novasstrading.com' => 'admin',

    // Add more people below, e.g.:
    // 'ornab@novasstrading.com' => 'admin',
    // 'rakib@novasstrading.com' => 'admin',
];
