// ============================================================
// EMAIL TEMPLATES - French (fr)
// ============================================================

const APP_URL = process.env.APP_URL || 'https://app.uplifthq.co.uk';

export default {
  password_changed: {
    subject: 'Votre mot de passe Uplift a été modifié',
    html: (data) => `
      <h2>Mot de passe modifié</h2>
      <p>Bonjour ${data.firstName},</p>
      <p>Le mot de passe de votre compte Uplift a été modifié le ${data.timestamp || new Date().toLocaleString('fr-FR')}.</p>
      <p><strong>Appareil :</strong> ${data.device || 'Inconnu'}</p>
      <p><strong>Adresse IP :</strong> ${data.ipAddress || 'Inconnue'}</p>
      <p>Si vous n'avez pas effectué cette modification, veuillez contacter immédiatement votre administrateur et réinitialiser votre mot de passe.</p>
      <p>— L'équipe Uplift</p>
    `,
    text: (data) => `Mot de passe modifié\n\nBonjour ${data.firstName},\n\nLe mot de passe de votre compte Uplift a été modifié le ${data.timestamp || new Date().toLocaleString('fr-FR')}.\n\nAppareil : ${data.device || 'Inconnu'}\nAdresse IP : ${data.ipAddress || 'Inconnue'}\n\nSi vous n'avez pas effectué cette modification, veuillez contacter immédiatement votre administrateur.\n\n— L'équipe Uplift`,
  },

  new_device_login: {
    subject: 'Nouvelle connexion à votre compte Uplift',
    html: (data) => `
      <h2>Nouvelle connexion détectée</h2>
      <p>Bonjour ${data.firstName},</p>
      <p>Nous avons détecté une nouvelle connexion à votre compte Uplift :</p>
      <ul>
        <li><strong>Appareil :</strong> ${data.device || 'Inconnu'}</li>
        <li><strong>Navigateur :</strong> ${data.browser || 'Inconnu'}</li>
        <li><strong>Localisation :</strong> ${data.location || 'Inconnue'}</li>
        <li><strong>Adresse IP :</strong> ${data.ipAddress || 'Inconnue'}</li>
        <li><strong>Heure :</strong> ${data.timestamp || new Date().toLocaleString('fr-FR')}</li>
      </ul>
      <p>Si c'était vous, vous pouvez ignorer cet e-mail. Si vous ne reconnaissez pas cette activité, veuillez modifier votre mot de passe immédiatement.</p>
      <p>— L'équipe Uplift</p>
    `,
    text: (data) => `Nouvelle connexion détectée\n\nBonjour ${data.firstName},\n\nNous avons détecté une nouvelle connexion à votre compte Uplift :\n\nAppareil : ${data.device || 'Inconnu'}\nNavigateur : ${data.browser || 'Inconnu'}\nLocalisation : ${data.location || 'Inconnue'}\nAdresse IP : ${data.ipAddress || 'Inconnue'}\nHeure : ${data.timestamp || new Date().toLocaleString('fr-FR')}\n\n— L'équipe Uplift`,
  },

  account_locked: {
    subject: 'Votre compte Uplift a été verrouillé',
    html: (data) => `
      <h2>Compte verrouillé</h2>
      <p>Bonjour ${data.firstName},</p>
      <p>Votre compte Uplift a été temporairement verrouillé en raison de plusieurs tentatives de connexion échouées.</p>
      <p>Votre compte sera automatiquement déverrouillé dans <strong>30 minutes</strong>.</p>
      <p>Si vous avez besoin d'un accès immédiat, veuillez contacter votre administrateur.</p>
      <p>— L'équipe Uplift</p>
    `,
    text: (data) => `Compte verrouillé\n\nBonjour ${data.firstName},\n\nVotre compte Uplift a été temporairement verrouillé en raison de plusieurs tentatives de connexion échouées.\n\nVotre compte sera automatiquement déverrouillé dans 30 minutes.\n\n— L'équipe Uplift`,
  },

  account_unlocked: {
    subject: 'Votre compte Uplift a été déverrouillé',
    html: (data) => `
      <h2>Compte déverrouillé</h2>
      <p>Bonjour ${data.firstName},</p>
      <p>Votre compte Uplift a été déverrouillé par un administrateur. Vous pouvez maintenant vous connecter.</p>
      <p>Si vous avez oublié votre mot de passe, utilisez le lien « Mot de passe oublié » sur la page de connexion.</p>
      <p>— L'équipe Uplift</p>
    `,
    text: (data) => `Compte déverrouillé\n\nBonjour ${data.firstName},\n\nVotre compte Uplift a été déverrouillé. Vous pouvez maintenant vous connecter.\n\n— L'équipe Uplift`,
  },

  password_reset_required: {
    subject: 'Réinitialisation du mot de passe requise pour votre compte Uplift',
    html: (data) => `
      <h2>Réinitialisation du mot de passe requise</h2>
      <p>Bonjour ${data.firstName},</p>
      <p>Un administrateur a demandé que vous changiez votre mot de passe lors de votre prochaine connexion.</p>
      <p>Veuillez vous connecter à Uplift et définir un nouveau mot de passe.</p>
      <p>— L'équipe Uplift</p>
    `,
    text: (data) => `Réinitialisation du mot de passe requise\n\nBonjour ${data.firstName},\n\nUn administrateur a demandé que vous changiez votre mot de passe lors de votre prochaine connexion.\n\n— L'équipe Uplift`,
  },

  invitation: {
    subject: 'Vous avez été invité(e) à rejoindre Uplift',
    html: (data) => `
      <h2>Vous êtes invité(e) !</h2>
      <p>Bonjour ${data.firstName},</p>
      <p><strong>${data.invitedBy?.first_name} ${data.invitedBy?.last_name}</strong> vous a invité(e) à rejoindre son équipe sur Uplift.</p>
      <p>Cliquez sur le bouton ci-dessous pour accepter votre invitation et configurer votre compte :</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/accept-invitation?token=${data.invitationToken}"
           style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Accepter l'invitation
        </a>
      </p>
      <p>Cette invitation expire dans 7 jours.</p>
      <p>— L'équipe Uplift</p>
    `,
    text: (data) => `Vous êtes invité(e) !\n\nBonjour ${data.firstName},\n\n${data.invitedBy?.first_name} ${data.invitedBy?.last_name} vous a invité(e) à rejoindre son équipe sur Uplift.\n\nAccepter l'invitation : ${APP_URL}/accept-invitation?token=${data.invitationToken}\n\nCette invitation expire dans 7 jours.\n\n— L'équipe Uplift`,
  },

  password_reset: {
    subject: 'Réinitialiser votre mot de passe Uplift',
    html: (data) => `
      <h2>Réinitialisation du mot de passe</h2>
      <p>Bonjour ${data.firstName},</p>
      <p>Nous avons reçu une demande de réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/reset-password?token=${data.resetToken}"
           style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Réinitialiser le mot de passe
        </a>
      </p>
      <p>Ce lien expire dans 1 heure.</p>
      <p>Si vous n'avez pas fait cette demande, vous pouvez ignorer cet e-mail.</p>
      <p>— L'équipe Uplift</p>
    `,
    text: (data) => `Réinitialisation du mot de passe\n\nBonjour ${data.firstName},\n\nNous avons reçu une demande de réinitialisation de votre mot de passe.\n\nRéinitialiser le mot de passe : ${APP_URL}/reset-password?token=${data.resetToken}\n\nCe lien expire dans 1 heure.\n\n— L'équipe Uplift`,
  },

  deletion_requested: {
    subject: 'Demande de suppression de compte reçue',
    html: (data) => `
      <h2>Suppression de compte demandée</h2>
      <p>Bonjour ${data.firstName},</p>
      <p>Nous avons reçu votre demande de suppression de votre compte Uplift.</p>
      <p>Votre compte et toutes les données associées seront définitivement supprimés dans <strong>30 jours</strong>.</p>
      <p>Si vous changez d'avis, vous pouvez annuler cette demande en vous connectant à votre compte.</p>
      <p>— L'équipe Uplift</p>
    `,
    text: (data) => `Suppression de compte demandée\n\nBonjour ${data.firstName},\n\nNous avons reçu votre demande de suppression de votre compte Uplift.\n\nVotre compte sera définitivement supprimé dans 30 jours.\n\n— L'équipe Uplift`,
  },

  email_verification: {
    subject: 'Vérifiez votre adresse e-mail Uplift',
    html: (data) => `
      <h2>Vérifiez votre e-mail</h2>
      <p>Bonjour ${data.firstName},</p>
      <p>Veuillez vérifier votre adresse e-mail en cliquant sur le bouton ci-dessous :</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/verify-email?token=${data.verificationToken}"
           style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Vérifier l'e-mail
        </a>
      </p>
      <p>Ce lien expire dans 24 heures.</p>
      <p>— L'équipe Uplift</p>
    `,
    text: (data) => `Vérifiez votre e-mail\n\nBonjour ${data.firstName},\n\nVeuillez vérifier votre e-mail : ${APP_URL}/verify-email?token=${data.verificationToken}\n\nCe lien expire dans 24 heures.\n\n— L'équipe Uplift`,
  },

  account_deactivated: {
    subject: 'Votre compte Uplift a été désactivé',
    html: (data) => `
      <h2>Compte désactivé</h2>
      <p>Bonjour ${data.firstName},</p>
      <p>Votre compte Uplift a été désactivé par un administrateur.</p>
      ${data.reason ? `<p><strong>Raison :</strong> ${data.reason}</p>` : ''}
      <p>Si vous pensez qu'il s'agit d'une erreur, veuillez contacter l'administrateur de votre organisation.</p>
      <p>— L'équipe Uplift</p>
    `,
    text: (data) => `Compte désactivé\n\nBonjour ${data.firstName},\n\nVotre compte Uplift a été désactivé par un administrateur.\n\n${data.reason ? `Raison : ${data.reason}\n\n` : ''}— L'équipe Uplift`,
  },

  payment_failed: {
    subject: 'Échec du paiement pour votre abonnement Uplift',
    html: (data) => `
      <h2>Échec du paiement</h2>
      <p>Bonjour ${data.firstName},</p>
      <p>Nous n'avons pas pu traiter votre paiement pour votre abonnement Uplift.</p>
      <p><strong>Montant :</strong> ${data.currency} ${(data.amount / 100).toFixed(2)}</p>
      <p>Veuillez mettre à jour votre méthode de paiement pour éviter toute interruption de votre service.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.billingPortalUrl}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Mettre à jour le moyen de paiement
        </a>
      </p>
      <p>— L'équipe Uplift</p>
    `,
    text: (data) => `Échec du paiement\n\nBonjour ${data.firstName},\n\nNous n'avons pas pu traiter votre paiement pour votre abonnement Uplift.\n\nMontant : ${data.currency} ${(data.amount / 100).toFixed(2)}\n\nVeuillez mettre à jour votre méthode de paiement : ${data.billingPortalUrl}\n\n— L'équipe Uplift`,
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
              Voir les détails
            </a>
          </p>
          ` : ''}
        </div>
      </div>
    `,
    text: (data) => `${data.title}\n\n${data.body}\n\n${data.actionUrl ? `Voir les détails : ${APP_URL}${data.actionUrl}` : ''}\n\n— L'équipe Uplift`,
  },

  // ============================================================
  // MODÈLES SPÉCIFIQUES RH
  // ============================================================

  shift_assigned: {
    subject: 'Nouveau créneau attribué',
    html: (data) => `
      <h2>Créneau attribué</h2>
      <p>Bonjour ${data.firstName},</p>
      <p>Un nouveau créneau vous a été attribué :</p>
      <ul>
        <li><strong>Date :</strong> ${data.shiftDate}</li>
        <li><strong>Horaires :</strong> ${data.startTime} - ${data.endTime}</li>
        <li><strong>Lieu :</strong> ${data.location || 'Voir le planning pour les détails'}</li>
        ${data.role ? `<li><strong>Rôle :</strong> ${data.role}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/schedule" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Voir le planning
        </a>
      </p>
      <p>— L'équipe Uplift</p>
    `,
    text: (data) => `Créneau attribué\n\nBonjour ${data.firstName},\n\nUn nouveau créneau vous a été attribué :\n\nDate : ${data.shiftDate}\nHoraires : ${data.startTime} - ${data.endTime}\nLieu : ${data.location || 'Voir le planning pour les détails'}\n${data.role ? `Rôle : ${data.role}\n` : ''}\nVoir le planning : ${APP_URL}/schedule\n\n— L'équipe Uplift`,
  },

  time_off_decision: {
    subject: (data) => `Votre demande de congé a été ${data.approved ? 'approuvée' : 'refusée'}`,
    html: (data) => `
      <h2>Demande de congé ${data.approved ? 'approuvée' : 'refusée'}</h2>
      <p>Bonjour ${data.firstName},</p>
      <p>Votre demande de congé a été <strong>${data.approved ? 'approuvée' : 'refusée'}</strong>.</p>
      <ul>
        <li><strong>Type :</strong> ${data.leaveType}</li>
        <li><strong>Dates :</strong> ${data.startDate} - ${data.endDate}</li>
        <li><strong>Jours :</strong> ${data.totalDays}</li>
        ${data.reviewedBy ? `<li><strong>Examiné par :</strong> ${data.reviewedBy}</li>` : ''}
      </ul>
      ${data.notes ? `<p><strong>Notes :</strong> ${data.notes}</p>` : ''}
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/time-off" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Voir les congés
        </a>
      </p>
      <p>— L'équipe Uplift</p>
    `,
    text: (data) => `Demande de congé ${data.approved ? 'approuvée' : 'refusée'}\n\nBonjour ${data.firstName},\n\nVotre demande de congé a été ${data.approved ? 'approuvée' : 'refusée'}.\n\nType : ${data.leaveType}\nDates : ${data.startDate} - ${data.endDate}\nJours : ${data.totalDays}\n${data.reviewedBy ? `Examiné par : ${data.reviewedBy}\n` : ''}${data.notes ? `Notes : ${data.notes}\n` : ''}\nVoir les détails : ${APP_URL}/time-off\n\n— L'équipe Uplift`,
  },

  payslip_available: {
    subject: (data) => `Votre bulletin de paie pour ${data.payPeriod} est disponible`,
    html: (data) => `
      <h2>Bulletin de paie disponible</h2>
      <p>Bonjour ${data.firstName},</p>
      <p>Votre bulletin de paie pour <strong>${data.payPeriod}</strong> est maintenant disponible.</p>
      <ul>
        <li><strong>Date de paiement :</strong> ${data.payDate}</li>
        <li><strong>Salaire net :</strong> ${data.currency} ${data.netPay}</li>
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/payslips" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Voir le bulletin de paie
        </a>
      </p>
      <p>— L'équipe Uplift</p>
    `,
    text: (data) => `Bulletin de paie disponible\n\nBonjour ${data.firstName},\n\nVotre bulletin de paie pour ${data.payPeriod} est maintenant disponible.\n\nDate de paiement : ${data.payDate}\nSalaire net : ${data.currency} ${data.netPay}\n\nVoir le bulletin : ${APP_URL}/payslips\n\n— L'équipe Uplift`,
  },

  review_assigned: {
    subject: 'Évaluation de performance attribuée',
    html: (data) => `
      <h2>Évaluation de performance attribuée</h2>
      <p>Bonjour ${data.firstName},</p>
      <p>Une évaluation de performance vous a été attribuée${data.reviewee ? ` pour <strong>${data.reviewee}</strong>` : ''}.</p>
      <ul>
        <li><strong>Type :</strong> ${data.reviewType}</li>
        <li><strong>Date limite :</strong> ${data.dueDate}</li>
        ${data.reviewPeriod ? `<li><strong>Période d'évaluation :</strong> ${data.reviewPeriod}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/performance/reviews/${data.reviewId || ''}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Commencer l'évaluation
        </a>
      </p>
      <p>— L'équipe Uplift</p>
    `,
    text: (data) => `Évaluation de performance attribuée\n\nBonjour ${data.firstName},\n\nUne évaluation de performance vous a été attribuée${data.reviewee ? ` pour ${data.reviewee}` : ''}.\n\nType : ${data.reviewType}\nDate limite : ${data.dueDate}\n${data.reviewPeriod ? `Période d'évaluation : ${data.reviewPeriod}\n` : ''}\nCommencer : ${APP_URL}/performance/reviews/${data.reviewId || ''}\n\n— L'équipe Uplift`,
  },

  course_assigned: {
    subject: (data) => `Nouvelle formation attribuée : ${data.courseName}`,
    html: (data) => `
      <h2>Formation attribuée</h2>
      <p>Bonjour ${data.firstName},</p>
      <p>Une nouvelle formation vous a été attribuée :</p>
      <ul>
        <li><strong>Cours :</strong> ${data.courseName}</li>
        ${data.description ? `<li><strong>Description :</strong> ${data.description}</li>` : ''}
        <li><strong>Date limite :</strong> ${data.dueDate}</li>
        ${data.estimatedDuration ? `<li><strong>Durée estimée :</strong> ${data.estimatedDuration}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/learning/courses/${data.courseId || ''}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Commencer le cours
        </a>
      </p>
      <p>— L'équipe Uplift</p>
    `,
    text: (data) => `Formation attribuée\n\nBonjour ${data.firstName},\n\nUne nouvelle formation vous a été attribuée :\n\nCours : ${data.courseName}\n${data.description ? `Description : ${data.description}\n` : ''}Date limite : ${data.dueDate}\n${data.estimatedDuration ? `Durée estimée : ${data.estimatedDuration}\n` : ''}\nCommencer : ${APP_URL}/learning/courses/${data.courseId || ''}\n\n— L'équipe Uplift`,
  },

  recognition_received: {
    subject: (data) => `${data.senderName} vous a envoyé une reconnaissance !`,
    html: (data) => `
      <h2>Vous avez été reconnu(e) !</h2>
      <p>Bonjour ${data.firstName},</p>
      <p><strong>${data.senderName}</strong> vous a reconnu(e) pour votre excellent travail !</p>
      ${data.badge ? `<p style="text-align: center; font-size: 48px;">${data.badge}</p>` : ''}
      ${data.message ? `<blockquote style="border-left: 4px solid #F26522; padding-left: 16px; margin: 20px 0; font-style: italic;">"${data.message}"</blockquote>` : ''}
      ${data.points ? `<p><strong>Points gagnés :</strong> ${data.points}</p>` : ''}
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/recognition" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Voir la reconnaissance
        </a>
      </p>
      <p>— L'équipe Uplift</p>
    `,
    text: (data) => `Vous avez été reconnu(e) !\n\nBonjour ${data.firstName},\n\n${data.senderName} vous a reconnu(e) pour votre excellent travail !\n\n${data.message ? `"${data.message}"\n\n` : ''}${data.points ? `Points gagnés : ${data.points}\n` : ''}\nVoir : ${APP_URL}/recognition\n\n— L'équipe Uplift`,
  },

  expense_decision: {
    subject: (data) => `Votre note de frais a été ${data.approved ? 'approuvée' : 'refusée'}`,
    html: (data) => `
      <h2>Note de frais ${data.approved ? 'approuvée' : 'refusée'}</h2>
      <p>Bonjour ${data.firstName},</p>
      <p>Votre note de frais a été <strong>${data.approved ? 'approuvée' : 'refusée'}</strong>.</p>
      <ul>
        <li><strong>Description :</strong> ${data.description}</li>
        <li><strong>Montant :</strong> ${data.currency} ${data.amount}</li>
        <li><strong>Soumis le :</strong> ${data.submittedDate}</li>
        ${data.reviewedBy ? `<li><strong>Examiné par :</strong> ${data.reviewedBy}</li>` : ''}
      </ul>
      ${data.notes ? `<p><strong>Notes :</strong> ${data.notes}</p>` : ''}
      ${data.approved ? `<p>Le montant sera inclus dans votre prochaine paie.</p>` : ''}
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/expenses" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Voir les frais
        </a>
      </p>
      <p>— L'équipe Uplift</p>
    `,
    text: (data) => `Note de frais ${data.approved ? 'approuvée' : 'refusée'}\n\nBonjour ${data.firstName},\n\nVotre note de frais a été ${data.approved ? 'approuvée' : 'refusée'}.\n\nDescription : ${data.description}\nMontant : ${data.currency} ${data.amount}\nSoumis le : ${data.submittedDate}\n${data.reviewedBy ? `Examiné par : ${data.reviewedBy}\n` : ''}${data.notes ? `Notes : ${data.notes}\n` : ''}${data.approved ? `\nLe montant sera inclus dans votre prochaine paie.\n` : ''}\nVoir : ${APP_URL}/expenses\n\n— L'équipe Uplift`,
  },

  document_signature_required: {
    subject: (data) => `Document nécessitant votre signature : ${data.documentName}`,
    html: (data) => `
      <h2>Signature requise</h2>
      <p>Bonjour ${data.firstName},</p>
      <p>Un document nécessite votre signature :</p>
      <ul>
        <li><strong>Document :</strong> ${data.documentName}</li>
        ${data.description ? `<li><strong>Description :</strong> ${data.description}</li>` : ''}
        ${data.requestedBy ? `<li><strong>Demandé par :</strong> ${data.requestedBy}</li>` : ''}
        ${data.dueDate ? `<li><strong>Date limite :</strong> ${data.dueDate}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/documents/${data.documentId || ''}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Consulter et signer
        </a>
      </p>
      <p>— L'équipe Uplift</p>
    `,
    text: (data) => `Signature requise\n\nBonjour ${data.firstName},\n\nUn document nécessite votre signature :\n\nDocument : ${data.documentName}\n${data.description ? `Description : ${data.description}\n` : ''}${data.requestedBy ? `Demandé par : ${data.requestedBy}\n` : ''}${data.dueDate ? `Date limite : ${data.dueDate}\n` : ''}\nConsulter et signer : ${APP_URL}/documents/${data.documentId || ''}\n\n— L'équipe Uplift`,
  },
};
