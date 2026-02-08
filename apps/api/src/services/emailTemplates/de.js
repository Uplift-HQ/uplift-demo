// ============================================================
// EMAIL TEMPLATES - German (de)
// ============================================================

const APP_URL = process.env.APP_URL || 'https://app.uplifthq.co.uk';

export default {
  password_changed: {
    subject: 'Ihr Uplift-Passwort wurde geändert',
    html: (data) => `
      <h2>Passwort geändert</h2>
      <p>Hallo ${data.firstName},</p>
      <p>Ihr Uplift-Kontopasswort wurde am ${data.timestamp || new Date().toLocaleString('de-DE')} geändert.</p>
      <p><strong>Gerät:</strong> ${data.device || 'Unbekannt'}</p>
      <p><strong>IP-Adresse:</strong> ${data.ipAddress || 'Unbekannt'}</p>
      <p>Wenn Sie diese Änderung nicht vorgenommen haben, wenden Sie sich bitte sofort an Ihren Administrator und setzen Sie Ihr Passwort zurück.</p>
      <p>— Das Uplift-Team</p>
    `,
    text: (data) => `Passwort geändert\n\nHallo ${data.firstName},\n\nIhr Uplift-Kontopasswort wurde am ${data.timestamp || new Date().toLocaleString('de-DE')} geändert.\n\nGerät: ${data.device || 'Unbekannt'}\nIP-Adresse: ${data.ipAddress || 'Unbekannt'}\n\nWenn Sie diese Änderung nicht vorgenommen haben, wenden Sie sich bitte sofort an Ihren Administrator.\n\n— Das Uplift-Team`,
  },

  new_device_login: {
    subject: 'Neue Geräteanmeldung bei Ihrem Uplift-Konto',
    html: (data) => `
      <h2>Neue Geräteanmeldung</h2>
      <p>Hallo ${data.firstName},</p>
      <p>Wir haben eine neue Anmeldung bei Ihrem Uplift-Konto festgestellt:</p>
      <ul>
        <li><strong>Gerät:</strong> ${data.device || 'Unbekannt'}</li>
        <li><strong>Browser:</strong> ${data.browser || 'Unbekannt'}</li>
        <li><strong>Standort:</strong> ${data.location || 'Unbekannt'}</li>
        <li><strong>IP-Adresse:</strong> ${data.ipAddress || 'Unbekannt'}</li>
        <li><strong>Zeit:</strong> ${data.timestamp || new Date().toLocaleString('de-DE')}</li>
      </ul>
      <p>Wenn Sie das waren, können Sie diese E-Mail ignorieren. Wenn Sie diese Aktivität nicht erkennen, ändern Sie bitte sofort Ihr Passwort.</p>
      <p>— Das Uplift-Team</p>
    `,
    text: (data) => `Neue Geräteanmeldung\n\nHallo ${data.firstName},\n\nWir haben eine neue Anmeldung bei Ihrem Uplift-Konto festgestellt:\n\nGerät: ${data.device || 'Unbekannt'}\nBrowser: ${data.browser || 'Unbekannt'}\nStandort: ${data.location || 'Unbekannt'}\nIP-Adresse: ${data.ipAddress || 'Unbekannt'}\nZeit: ${data.timestamp || new Date().toLocaleString('de-DE')}\n\n— Das Uplift-Team`,
  },

  account_locked: {
    subject: 'Ihr Uplift-Konto wurde gesperrt',
    html: (data) => `
      <h2>Konto gesperrt</h2>
      <p>Hallo ${data.firstName},</p>
      <p>Ihr Uplift-Konto wurde aufgrund mehrerer fehlgeschlagener Anmeldeversuche vorübergehend gesperrt.</p>
      <p>Ihr Konto wird automatisch in <strong>30 Minuten</strong> entsperrt.</p>
      <p>Wenn Sie sofortigen Zugang benötigen, wenden Sie sich bitte an Ihren Administrator.</p>
      <p>— Das Uplift-Team</p>
    `,
    text: (data) => `Konto gesperrt\n\nHallo ${data.firstName},\n\nIhr Uplift-Konto wurde aufgrund mehrerer fehlgeschlagener Anmeldeversuche vorübergehend gesperrt.\n\nIhr Konto wird automatisch in 30 Minuten entsperrt.\n\n— Das Uplift-Team`,
  },

  account_unlocked: {
    subject: 'Ihr Uplift-Konto wurde entsperrt',
    html: (data) => `
      <h2>Konto entsperrt</h2>
      <p>Hallo ${data.firstName},</p>
      <p>Ihr Uplift-Konto wurde von einem Administrator entsperrt. Sie können sich jetzt anmelden.</p>
      <p>Wenn Sie Ihr Passwort vergessen haben, nutzen Sie bitte den Link „Passwort vergessen" auf der Anmeldeseite.</p>
      <p>— Das Uplift-Team</p>
    `,
    text: (data) => `Konto entsperrt\n\nHallo ${data.firstName},\n\nIhr Uplift-Konto wurde entsperrt. Sie können sich jetzt anmelden.\n\n— Das Uplift-Team`,
  },

  password_reset_required: {
    subject: 'Passwortänderung für Ihr Uplift-Konto erforderlich',
    html: (data) => `
      <h2>Passwortänderung erforderlich</h2>
      <p>Hallo ${data.firstName},</p>
      <p>Ein Administrator hat festgelegt, dass Sie Ihr Passwort bei der nächsten Anmeldung ändern müssen.</p>
      <p>Bitte melden Sie sich bei Uplift an und legen Sie ein neues Passwort fest.</p>
      <p>— Das Uplift-Team</p>
    `,
    text: (data) => `Passwortänderung erforderlich\n\nHallo ${data.firstName},\n\nEin Administrator hat festgelegt, dass Sie Ihr Passwort bei der nächsten Anmeldung ändern müssen.\n\n— Das Uplift-Team`,
  },

  invitation: {
    subject: 'Sie wurden zu Uplift eingeladen',
    html: (data) => `
      <h2>Sie sind eingeladen!</h2>
      <p>Hallo ${data.firstName},</p>
      <p><strong>${data.invitedBy?.first_name} ${data.invitedBy?.last_name}</strong> hat Sie eingeladen, dem Team auf Uplift beizutreten.</p>
      <p>Klicken Sie auf den Button unten, um Ihre Einladung anzunehmen und Ihr Konto einzurichten:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/accept-invitation?token=${data.invitationToken}"
           style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Einladung annehmen
        </a>
      </p>
      <p>Diese Einladung läuft in 7 Tagen ab.</p>
      <p>— Das Uplift-Team</p>
    `,
    text: (data) => `Sie sind eingeladen!\n\nHallo ${data.firstName},\n\n${data.invitedBy?.first_name} ${data.invitedBy?.last_name} hat Sie eingeladen, dem Team auf Uplift beizutreten.\n\nEinladung annehmen: ${APP_URL}/accept-invitation?token=${data.invitationToken}\n\nDiese Einladung läuft in 7 Tagen ab.\n\n— Das Uplift-Team`,
  },

  password_reset: {
    subject: 'Uplift-Passwort zurücksetzen',
    html: (data) => `
      <h2>Passwort zurücksetzen</h2>
      <p>Hallo ${data.firstName},</p>
      <p>Wir haben eine Anfrage erhalten, Ihr Passwort zurückzusetzen. Klicken Sie auf den Button unten, um ein neues Passwort festzulegen:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/reset-password?token=${data.resetToken}"
           style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Passwort zurücksetzen
        </a>
      </p>
      <p>Dieser Link läuft in 1 Stunde ab.</p>
      <p>Wenn Sie dies nicht angefordert haben, können Sie diese E-Mail ignorieren.</p>
      <p>— Das Uplift-Team</p>
    `,
    text: (data) => `Passwort zurücksetzen\n\nHallo ${data.firstName},\n\nWir haben eine Anfrage erhalten, Ihr Passwort zurückzusetzen.\n\nPasswort zurücksetzen: ${APP_URL}/reset-password?token=${data.resetToken}\n\nDieser Link läuft in 1 Stunde ab.\n\n— Das Uplift-Team`,
  },

  deletion_requested: {
    subject: 'Antrag auf Kontolöschung erhalten',
    html: (data) => `
      <h2>Kontolöschung beantragt</h2>
      <p>Hallo ${data.firstName},</p>
      <p>Wir haben Ihren Antrag auf Löschung Ihres Uplift-Kontos erhalten.</p>
      <p>Ihr Konto und alle zugehörigen Daten werden in <strong>30 Tagen</strong> dauerhaft gelöscht.</p>
      <p>Wenn Sie Ihre Meinung ändern, können Sie diesen Antrag stornieren, indem Sie sich in Ihr Konto einloggen.</p>
      <p>— Das Uplift-Team</p>
    `,
    text: (data) => `Kontolöschung beantragt\n\nHallo ${data.firstName},\n\nWir haben Ihren Antrag auf Löschung Ihres Uplift-Kontos erhalten.\n\nIhr Konto wird in 30 Tagen dauerhaft gelöscht.\n\n— Das Uplift-Team`,
  },

  email_verification: {
    subject: 'Bestätigen Sie Ihre Uplift-E-Mail-Adresse',
    html: (data) => `
      <h2>E-Mail bestätigen</h2>
      <p>Hallo ${data.firstName},</p>
      <p>Bitte bestätigen Sie Ihre E-Mail-Adresse, indem Sie auf den Button unten klicken:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/verify-email?token=${data.verificationToken}"
           style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          E-Mail bestätigen
        </a>
      </p>
      <p>Dieser Link läuft in 24 Stunden ab.</p>
      <p>— Das Uplift-Team</p>
    `,
    text: (data) => `E-Mail bestätigen\n\nHallo ${data.firstName},\n\nBitte bestätigen Sie Ihre E-Mail: ${APP_URL}/verify-email?token=${data.verificationToken}\n\nDieser Link läuft in 24 Stunden ab.\n\n— Das Uplift-Team`,
  },

  account_deactivated: {
    subject: 'Ihr Uplift-Konto wurde deaktiviert',
    html: (data) => `
      <h2>Konto deaktiviert</h2>
      <p>Hallo ${data.firstName},</p>
      <p>Ihr Uplift-Konto wurde von einem Administrator deaktiviert.</p>
      ${data.reason ? `<p><strong>Grund:</strong> ${data.reason}</p>` : ''}
      <p>Wenn Sie glauben, dass dies ein Fehler war, wenden Sie sich bitte an den Administrator Ihrer Organisation.</p>
      <p>— Das Uplift-Team</p>
    `,
    text: (data) => `Konto deaktiviert\n\nHallo ${data.firstName},\n\nIhr Uplift-Konto wurde von einem Administrator deaktiviert.\n\n${data.reason ? `Grund: ${data.reason}\n\n` : ''}— Das Uplift-Team`,
  },

  payment_failed: {
    subject: 'Zahlung für Ihr Uplift-Abonnement fehlgeschlagen',
    html: (data) => `
      <h2>Zahlung fehlgeschlagen</h2>
      <p>Hallo ${data.firstName},</p>
      <p>Wir konnten die Zahlung für Ihr Uplift-Abonnement nicht verarbeiten.</p>
      <p><strong>Betrag:</strong> ${data.currency} ${(data.amount / 100).toFixed(2)}</p>
      <p>Bitte aktualisieren Sie Ihre Zahlungsmethode, um eine Unterbrechung Ihres Dienstes zu vermeiden.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.billingPortalUrl}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Zahlungsmethode aktualisieren
        </a>
      </p>
      <p>— Das Uplift-Team</p>
    `,
    text: (data) => `Zahlung fehlgeschlagen\n\nHallo ${data.firstName},\n\nWir konnten die Zahlung für Ihr Uplift-Abonnement nicht verarbeiten.\n\nBetrag: ${data.currency} ${(data.amount / 100).toFixed(2)}\n\nBitte aktualisieren Sie Ihre Zahlungsmethode: ${data.billingPortalUrl}\n\n— Das Uplift-Team`,
  },

  notification: {
    subject: (data) => data.title,
    html: (data) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #F26522; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Uplift</h1>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #1e293b; margin: 0 0 16px 0;">${data.title}</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.6;">${data.body}</p>
          ${data.actionUrl ? `
          <p style="text-align: center; margin: 30px 0;">
            <a href="${APP_URL}${data.actionUrl}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Details anzeigen
            </a>
          </p>
          ` : ''}
        </div>
      </div>
    `,
    text: (data) => `${data.title}\n\n${data.body}\n\n${data.actionUrl ? `Details anzeigen: ${APP_URL}${data.actionUrl}` : ''}\n\n— Das Uplift-Team`,
  },

  // ============================================================
  // HR-SPEZIFISCHE VORLAGEN
  // ============================================================

  shift_assigned: {
    subject: 'Neue Schicht wurde Ihnen zugewiesen',
    html: (data) => `
      <h2>Schicht zugewiesen</h2>
      <p>Hallo ${data.firstName},</p>
      <p>Ihnen wurde eine neue Schicht zugewiesen:</p>
      <ul>
        <li><strong>Datum:</strong> ${data.shiftDate}</li>
        <li><strong>Zeit:</strong> ${data.startTime} - ${data.endTime}</li>
        <li><strong>Standort:</strong> ${data.location || 'Siehe Dienstplan für Details'}</li>
        ${data.role ? `<li><strong>Rolle:</strong> ${data.role}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/schedule" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Dienstplan anzeigen
        </a>
      </p>
      <p>— Das Uplift-Team</p>
    `,
    text: (data) => `Schicht zugewiesen\n\nHallo ${data.firstName},\n\nIhnen wurde eine neue Schicht zugewiesen:\n\nDatum: ${data.shiftDate}\nZeit: ${data.startTime} - ${data.endTime}\nStandort: ${data.location || 'Siehe Dienstplan für Details'}\n${data.role ? `Rolle: ${data.role}\n` : ''}\nDienstplan anzeigen: ${APP_URL}/schedule\n\n— Das Uplift-Team`,
  },

  time_off_decision: {
    subject: (data) => `Ihr Urlaubsantrag wurde ${data.approved ? 'genehmigt' : 'abgelehnt'}`,
    html: (data) => `
      <h2>Urlaubsantrag ${data.approved ? 'genehmigt' : 'abgelehnt'}</h2>
      <p>Hallo ${data.firstName},</p>
      <p>Ihr Urlaubsantrag wurde <strong>${data.approved ? 'genehmigt' : 'abgelehnt'}</strong>.</p>
      <ul>
        <li><strong>Art:</strong> ${data.leaveType}</li>
        <li><strong>Zeitraum:</strong> ${data.startDate} - ${data.endDate}</li>
        <li><strong>Tage:</strong> ${data.totalDays}</li>
        ${data.reviewedBy ? `<li><strong>Geprüft von:</strong> ${data.reviewedBy}</li>` : ''}
      </ul>
      ${data.notes ? `<p><strong>Anmerkungen:</strong> ${data.notes}</p>` : ''}
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/time-off" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Urlaub anzeigen
        </a>
      </p>
      <p>— Das Uplift-Team</p>
    `,
    text: (data) => `Urlaubsantrag ${data.approved ? 'genehmigt' : 'abgelehnt'}\n\nHallo ${data.firstName},\n\nIhr Urlaubsantrag wurde ${data.approved ? 'genehmigt' : 'abgelehnt'}.\n\nArt: ${data.leaveType}\nZeitraum: ${data.startDate} - ${data.endDate}\nTage: ${data.totalDays}\n${data.reviewedBy ? `Geprüft von: ${data.reviewedBy}\n` : ''}${data.notes ? `Anmerkungen: ${data.notes}\n` : ''}\nDetails anzeigen: ${APP_URL}/time-off\n\n— Das Uplift-Team`,
  },

  payslip_available: {
    subject: (data) => `Ihre Gehaltsabrechnung für ${data.payPeriod} ist verfügbar`,
    html: (data) => `
      <h2>Gehaltsabrechnung verfügbar</h2>
      <p>Hallo ${data.firstName},</p>
      <p>Ihre Gehaltsabrechnung für <strong>${data.payPeriod}</strong> ist jetzt verfügbar.</p>
      <ul>
        <li><strong>Auszahlungsdatum:</strong> ${data.payDate}</li>
        <li><strong>Nettobetrag:</strong> ${data.currency} ${data.netPay}</li>
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/payslips" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Gehaltsabrechnung anzeigen
        </a>
      </p>
      <p>— Das Uplift-Team</p>
    `,
    text: (data) => `Gehaltsabrechnung verfügbar\n\nHallo ${data.firstName},\n\nIhre Gehaltsabrechnung für ${data.payPeriod} ist jetzt verfügbar.\n\nAuszahlungsdatum: ${data.payDate}\nNettobetrag: ${data.currency} ${data.netPay}\n\nGehaltsabrechnung anzeigen: ${APP_URL}/payslips\n\n— Das Uplift-Team`,
  },

  review_assigned: {
    subject: 'Leistungsbeurteilung wurde Ihnen zugewiesen',
    html: (data) => `
      <h2>Leistungsbeurteilung zugewiesen</h2>
      <p>Hallo ${data.firstName},</p>
      <p>Ihnen wurde eine Leistungsbeurteilung zugewiesen${data.reviewee ? ` für <strong>${data.reviewee}</strong>` : ''}.</p>
      <ul>
        <li><strong>Art:</strong> ${data.reviewType}</li>
        <li><strong>Fällig am:</strong> ${data.dueDate}</li>
        ${data.reviewPeriod ? `<li><strong>Beurteilungszeitraum:</strong> ${data.reviewPeriod}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/performance/reviews/${data.reviewId || ''}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Beurteilung starten
        </a>
      </p>
      <p>— Das Uplift-Team</p>
    `,
    text: (data) => `Leistungsbeurteilung zugewiesen\n\nHallo ${data.firstName},\n\nIhnen wurde eine Leistungsbeurteilung zugewiesen${data.reviewee ? ` für ${data.reviewee}` : ''}.\n\nArt: ${data.reviewType}\nFällig am: ${data.dueDate}\n${data.reviewPeriod ? `Beurteilungszeitraum: ${data.reviewPeriod}\n` : ''}\nBeurteilung starten: ${APP_URL}/performance/reviews/${data.reviewId || ''}\n\n— Das Uplift-Team`,
  },

  course_assigned: {
    subject: (data) => `Neuer Schulungskurs zugewiesen: ${data.courseName}`,
    html: (data) => `
      <h2>Schulungskurs zugewiesen</h2>
      <p>Hallo ${data.firstName},</p>
      <p>Ihnen wurde ein neuer Schulungskurs zugewiesen:</p>
      <ul>
        <li><strong>Kurs:</strong> ${data.courseName}</li>
        ${data.description ? `<li><strong>Beschreibung:</strong> ${data.description}</li>` : ''}
        <li><strong>Fällig am:</strong> ${data.dueDate}</li>
        ${data.estimatedDuration ? `<li><strong>Geschätzte Dauer:</strong> ${data.estimatedDuration}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/learning/courses/${data.courseId || ''}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Kurs starten
        </a>
      </p>
      <p>— Das Uplift-Team</p>
    `,
    text: (data) => `Schulungskurs zugewiesen\n\nHallo ${data.firstName},\n\nIhnen wurde ein neuer Schulungskurs zugewiesen:\n\nKurs: ${data.courseName}\n${data.description ? `Beschreibung: ${data.description}\n` : ''}Fällig am: ${data.dueDate}\n${data.estimatedDuration ? `Geschätzte Dauer: ${data.estimatedDuration}\n` : ''}\nKurs starten: ${APP_URL}/learning/courses/${data.courseId || ''}\n\n— Das Uplift-Team`,
  },

  recognition_received: {
    subject: (data) => `${data.senderName} hat Ihnen eine Anerkennung geschickt!`,
    html: (data) => `
      <h2>Sie wurden anerkannt!</h2>
      <p>Hallo ${data.firstName},</p>
      <p><strong>${data.senderName}</strong> hat Sie für Ihre großartige Arbeit anerkannt!</p>
      ${data.badge ? `<p style="text-align: center; font-size: 48px;">${data.badge}</p>` : ''}
      ${data.message ? `<blockquote style="border-left: 4px solid #F26522; padding-left: 16px; margin: 20px 0; font-style: italic;">"${data.message}"</blockquote>` : ''}
      ${data.points ? `<p><strong>Erhaltene Punkte:</strong> ${data.points}</p>` : ''}
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/recognition" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Anerkennung anzeigen
        </a>
      </p>
      <p>— Das Uplift-Team</p>
    `,
    text: (data) => `Sie wurden anerkannt!\n\nHallo ${data.firstName},\n\n${data.senderName} hat Sie für Ihre großartige Arbeit anerkannt!\n\n${data.message ? `"${data.message}"\n\n` : ''}${data.points ? `Erhaltene Punkte: ${data.points}\n` : ''}\nAnerkennung anzeigen: ${APP_URL}/recognition\n\n— Das Uplift-Team`,
  },

  expense_decision: {
    subject: (data) => `Ihre Spesenabrechnung wurde ${data.approved ? 'genehmigt' : 'abgelehnt'}`,
    html: (data) => `
      <h2>Spesenabrechnung ${data.approved ? 'genehmigt' : 'abgelehnt'}</h2>
      <p>Hallo ${data.firstName},</p>
      <p>Ihre Spesenabrechnung wurde <strong>${data.approved ? 'genehmigt' : 'abgelehnt'}</strong>.</p>
      <ul>
        <li><strong>Beschreibung:</strong> ${data.description}</li>
        <li><strong>Betrag:</strong> ${data.currency} ${data.amount}</li>
        <li><strong>Eingereicht:</strong> ${data.submittedDate}</li>
        ${data.reviewedBy ? `<li><strong>Geprüft von:</strong> ${data.reviewedBy}</li>` : ''}
      </ul>
      ${data.notes ? `<p><strong>Anmerkungen:</strong> ${data.notes}</p>` : ''}
      ${data.approved ? `<p>Der Betrag wird in Ihrer nächsten Gehaltsabrechnung enthalten sein.</p>` : ''}
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/expenses" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Spesen anzeigen
        </a>
      </p>
      <p>— Das Uplift-Team</p>
    `,
    text: (data) => `Spesenabrechnung ${data.approved ? 'genehmigt' : 'abgelehnt'}\n\nHallo ${data.firstName},\n\nIhre Spesenabrechnung wurde ${data.approved ? 'genehmigt' : 'abgelehnt'}.\n\nBeschreibung: ${data.description}\nBetrag: ${data.currency} ${data.amount}\nEingereicht: ${data.submittedDate}\n${data.reviewedBy ? `Geprüft von: ${data.reviewedBy}\n` : ''}${data.notes ? `Anmerkungen: ${data.notes}\n` : ''}${data.approved ? `\nDer Betrag wird in Ihrer nächsten Gehaltsabrechnung enthalten sein.\n` : ''}\nSpesen anzeigen: ${APP_URL}/expenses\n\n— Das Uplift-Team`,
  },

  document_signature_required: {
    subject: (data) => `Dokument erfordert Ihre Unterschrift: ${data.documentName}`,
    html: (data) => `
      <h2>Unterschrift erforderlich</h2>
      <p>Hallo ${data.firstName},</p>
      <p>Ein Dokument erfordert Ihre Unterschrift:</p>
      <ul>
        <li><strong>Dokument:</strong> ${data.documentName}</li>
        ${data.description ? `<li><strong>Beschreibung:</strong> ${data.description}</li>` : ''}
        ${data.requestedBy ? `<li><strong>Angefordert von:</strong> ${data.requestedBy}</li>` : ''}
        ${data.dueDate ? `<li><strong>Fällig am:</strong> ${data.dueDate}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/documents/${data.documentId || ''}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Prüfen & Unterschreiben
        </a>
      </p>
      <p>— Das Uplift-Team</p>
    `,
    text: (data) => `Unterschrift erforderlich\n\nHallo ${data.firstName},\n\nEin Dokument erfordert Ihre Unterschrift:\n\nDokument: ${data.documentName}\n${data.description ? `Beschreibung: ${data.description}\n` : ''}${data.requestedBy ? `Angefordert von: ${data.requestedBy}\n` : ''}${data.dueDate ? `Fällig am: ${data.dueDate}\n` : ''}\nPrüfen & Unterschreiben: ${APP_URL}/documents/${data.documentId || ''}\n\n— Das Uplift-Team`,
  },
};
