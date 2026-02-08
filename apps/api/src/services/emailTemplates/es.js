// ============================================================
// EMAIL TEMPLATES - Spanish (es)
// ============================================================

const APP_URL = process.env.APP_URL || 'https://app.uplifthq.co.uk';

export default {
  password_changed: {
    subject: 'Tu contraseña de Uplift ha sido cambiada',
    html: (data) => `
      <h2>Contraseña cambiada</h2>
      <p>Hola ${data.firstName},</p>
      <p>La contraseña de tu cuenta Uplift fue cambiada el ${data.timestamp || new Date().toLocaleString('es-ES')}.</p>
      <p><strong>Dispositivo:</strong> ${data.device || 'Desconocido'}</p>
      <p><strong>Dirección IP:</strong> ${data.ipAddress || 'Desconocida'}</p>
      <p>Si no realizaste este cambio, contacta inmediatamente a tu administrador y restablece tu contraseña.</p>
      <p>— El equipo de Uplift</p>
    `,
    text: (data) => `Contraseña cambiada\n\nHola ${data.firstName},\n\nLa contraseña de tu cuenta Uplift fue cambiada el ${data.timestamp || new Date().toLocaleString('es-ES')}.\n\nDispositivo: ${data.device || 'Desconocido'}\nDirección IP: ${data.ipAddress || 'Desconocida'}\n\nSi no realizaste este cambio, contacta inmediatamente a tu administrador.\n\n— El equipo de Uplift`,
  },

  new_device_login: {
    subject: 'Nuevo inicio de sesión en tu cuenta Uplift',
    html: (data) => `
      <h2>Nuevo inicio de sesión</h2>
      <p>Hola ${data.firstName},</p>
      <p>Detectamos un nuevo inicio de sesión en tu cuenta Uplift:</p>
      <ul>
        <li><strong>Dispositivo:</strong> ${data.device || 'Desconocido'}</li>
        <li><strong>Navegador:</strong> ${data.browser || 'Desconocido'}</li>
        <li><strong>Ubicación:</strong> ${data.location || 'Desconocida'}</li>
        <li><strong>Dirección IP:</strong> ${data.ipAddress || 'Desconocida'}</li>
        <li><strong>Hora:</strong> ${data.timestamp || new Date().toLocaleString('es-ES')}</li>
      </ul>
      <p>Si fuiste tú, puedes ignorar este correo. Si no reconoces esta actividad, cambia tu contraseña inmediatamente.</p>
      <p>— El equipo de Uplift</p>
    `,
    text: (data) => `Nuevo inicio de sesión\n\nHola ${data.firstName},\n\nDetectamos un nuevo inicio de sesión en tu cuenta Uplift:\n\nDispositivo: ${data.device || 'Desconocido'}\nNavegador: ${data.browser || 'Desconocido'}\nUbicación: ${data.location || 'Desconocida'}\nDirección IP: ${data.ipAddress || 'Desconocida'}\nHora: ${data.timestamp || new Date().toLocaleString('es-ES')}\n\n— El equipo de Uplift`,
  },

  account_locked: {
    subject: 'Tu cuenta Uplift ha sido bloqueada',
    html: (data) => `
      <h2>Cuenta bloqueada</h2>
      <p>Hola ${data.firstName},</p>
      <p>Tu cuenta Uplift ha sido bloqueada temporalmente debido a múltiples intentos de inicio de sesión fallidos.</p>
      <p>Tu cuenta se desbloqueará automáticamente en <strong>30 minutos</strong>.</p>
      <p>Si necesitas acceso inmediato, contacta a tu administrador.</p>
      <p>— El equipo de Uplift</p>
    `,
    text: (data) => `Cuenta bloqueada\n\nHola ${data.firstName},\n\nTu cuenta Uplift ha sido bloqueada temporalmente debido a múltiples intentos de inicio de sesión fallidos.\n\nTu cuenta se desbloqueará automáticamente en 30 minutos.\n\n— El equipo de Uplift`,
  },

  account_unlocked: {
    subject: 'Tu cuenta Uplift ha sido desbloqueada',
    html: (data) => `
      <h2>Cuenta desbloqueada</h2>
      <p>Hola ${data.firstName},</p>
      <p>Tu cuenta Uplift ha sido desbloqueada por un administrador. Ya puedes iniciar sesión.</p>
      <p>Si olvidaste tu contraseña, usa el enlace "Olvidé mi contraseña" en la página de inicio de sesión.</p>
      <p>— El equipo de Uplift</p>
    `,
    text: (data) => `Cuenta desbloqueada\n\nHola ${data.firstName},\n\nTu cuenta Uplift ha sido desbloqueada. Ya puedes iniciar sesión.\n\n— El equipo de Uplift`,
  },

  password_reset_required: {
    subject: 'Se requiere restablecer la contraseña de tu cuenta Uplift',
    html: (data) => `
      <h2>Restablecimiento de contraseña requerido</h2>
      <p>Hola ${data.firstName},</p>
      <p>Un administrador ha requerido que cambies tu contraseña en tu próximo inicio de sesión.</p>
      <p>Por favor, inicia sesión en Uplift y establece una nueva contraseña.</p>
      <p>— El equipo de Uplift</p>
    `,
    text: (data) => `Restablecimiento de contraseña requerido\n\nHola ${data.firstName},\n\nUn administrador ha requerido que cambies tu contraseña en tu próximo inicio de sesión.\n\n— El equipo de Uplift`,
  },

  invitation: {
    subject: 'Has sido invitado/a a unirte a Uplift',
    html: (data) => `
      <h2>¡Estás invitado/a!</h2>
      <p>Hola ${data.firstName},</p>
      <p><strong>${data.invitedBy?.first_name} ${data.invitedBy?.last_name}</strong> te ha invitado a unirte a su equipo en Uplift.</p>
      <p>Haz clic en el botón de abajo para aceptar tu invitación y configurar tu cuenta:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/accept-invitation?token=${data.invitationToken}"
           style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Aceptar invitación
        </a>
      </p>
      <p>Esta invitación expirará en 7 días.</p>
      <p>— El equipo de Uplift</p>
    `,
    text: (data) => `¡Estás invitado/a!\n\nHola ${data.firstName},\n\n${data.invitedBy?.first_name} ${data.invitedBy?.last_name} te ha invitado a unirte a su equipo en Uplift.\n\nAceptar invitación: ${APP_URL}/accept-invitation?token=${data.invitationToken}\n\nEsta invitación expirará en 7 días.\n\n— El equipo de Uplift`,
  },

  password_reset: {
    subject: 'Restablece tu contraseña de Uplift',
    html: (data) => `
      <h2>Restablecer contraseña</h2>
      <p>Hola ${data.firstName},</p>
      <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para establecer una nueva contraseña:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/reset-password?token=${data.resetToken}"
           style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Restablecer contraseña
        </a>
      </p>
      <p>Este enlace expirará en 1 hora.</p>
      <p>Si no solicitaste esto, puedes ignorar este correo.</p>
      <p>— El equipo de Uplift</p>
    `,
    text: (data) => `Restablecer contraseña\n\nHola ${data.firstName},\n\nRecibimos una solicitud para restablecer tu contraseña.\n\nRestablecer contraseña: ${APP_URL}/reset-password?token=${data.resetToken}\n\nEste enlace expirará en 1 hora.\n\n— El equipo de Uplift`,
  },

  deletion_requested: {
    subject: 'Solicitud de eliminación de cuenta recibida',
    html: (data) => `
      <h2>Eliminación de cuenta solicitada</h2>
      <p>Hola ${data.firstName},</p>
      <p>Hemos recibido tu solicitud para eliminar tu cuenta Uplift.</p>
      <p>Tu cuenta y todos los datos asociados serán eliminados permanentemente en <strong>30 días</strong>.</p>
      <p>Si cambias de opinión, puedes cancelar esta solicitud iniciando sesión en tu cuenta.</p>
      <p>— El equipo de Uplift</p>
    `,
    text: (data) => `Eliminación de cuenta solicitada\n\nHola ${data.firstName},\n\nHemos recibido tu solicitud para eliminar tu cuenta Uplift.\n\nTu cuenta será eliminada permanentemente en 30 días.\n\n— El equipo de Uplift`,
  },

  email_verification: {
    subject: 'Verifica tu correo electrónico de Uplift',
    html: (data) => `
      <h2>Verifica tu correo</h2>
      <p>Hola ${data.firstName},</p>
      <p>Por favor verifica tu dirección de correo electrónico haciendo clic en el botón de abajo:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/verify-email?token=${data.verificationToken}"
           style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Verificar correo
        </a>
      </p>
      <p>Este enlace expirará en 24 horas.</p>
      <p>— El equipo de Uplift</p>
    `,
    text: (data) => `Verifica tu correo\n\nHola ${data.firstName},\n\nPor favor verifica tu correo: ${APP_URL}/verify-email?token=${data.verificationToken}\n\nEste enlace expirará en 24 horas.\n\n— El equipo de Uplift`,
  },

  account_deactivated: {
    subject: 'Tu cuenta Uplift ha sido desactivada',
    html: (data) => `
      <h2>Cuenta desactivada</h2>
      <p>Hola ${data.firstName},</p>
      <p>Tu cuenta Uplift ha sido desactivada por un administrador.</p>
      ${data.reason ? `<p><strong>Razón:</strong> ${data.reason}</p>` : ''}
      <p>Si crees que esto fue un error, contacta al administrador de tu organización.</p>
      <p>— El equipo de Uplift</p>
    `,
    text: (data) => `Cuenta desactivada\n\nHola ${data.firstName},\n\nTu cuenta Uplift ha sido desactivada por un administrador.\n\n${data.reason ? `Razón: ${data.reason}\n\n` : ''}— El equipo de Uplift`,
  },

  payment_failed: {
    subject: 'Falló el pago de tu suscripción a Uplift',
    html: (data) => `
      <h2>Pago fallido</h2>
      <p>Hola ${data.firstName},</p>
      <p>No pudimos procesar tu pago para tu suscripción a Uplift.</p>
      <p><strong>Monto:</strong> ${data.currency} ${(data.amount / 100).toFixed(2)}</p>
      <p>Por favor actualiza tu método de pago para evitar interrupciones en tu servicio.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.billingPortalUrl}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Actualizar método de pago
        </a>
      </p>
      <p>— El equipo de Uplift</p>
    `,
    text: (data) => `Pago fallido\n\nHola ${data.firstName},\n\nNo pudimos procesar tu pago para tu suscripción a Uplift.\n\nMonto: ${data.currency} ${(data.amount / 100).toFixed(2)}\n\nPor favor actualiza tu método de pago: ${data.billingPortalUrl}\n\n— El equipo de Uplift`,
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
              Ver detalles
            </a>
          </p>
          ` : ''}
        </div>
      </div>
    `,
    text: (data) => `${data.title}\n\n${data.body}\n\n${data.actionUrl ? `Ver detalles: ${APP_URL}${data.actionUrl}` : ''}\n\n— El equipo de Uplift`,
  },

  // ============================================================
  // PLANTILLAS ESPECÍFICAS DE RRHH
  // ============================================================

  shift_assigned: {
    subject: 'Nuevo turno asignado',
    html: (data) => `
      <h2>Turno asignado</h2>
      <p>Hola ${data.firstName},</p>
      <p>Se te ha asignado un nuevo turno:</p>
      <ul>
        <li><strong>Fecha:</strong> ${data.shiftDate}</li>
        <li><strong>Horario:</strong> ${data.startTime} - ${data.endTime}</li>
        <li><strong>Ubicación:</strong> ${data.location || 'Ver horario para más detalles'}</li>
        ${data.role ? `<li><strong>Rol:</strong> ${data.role}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/schedule" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Ver horario
        </a>
      </p>
      <p>— El equipo de Uplift</p>
    `,
    text: (data) => `Turno asignado\n\nHola ${data.firstName},\n\nSe te ha asignado un nuevo turno:\n\nFecha: ${data.shiftDate}\nHorario: ${data.startTime} - ${data.endTime}\nUbicación: ${data.location || 'Ver horario para más detalles'}\n${data.role ? `Rol: ${data.role}\n` : ''}\nVer horario: ${APP_URL}/schedule\n\n— El equipo de Uplift`,
  },

  time_off_decision: {
    subject: (data) => `Tu solicitud de ausencia ha sido ${data.approved ? 'aprobada' : 'rechazada'}`,
    html: (data) => `
      <h2>Solicitud de ausencia ${data.approved ? 'aprobada' : 'rechazada'}</h2>
      <p>Hola ${data.firstName},</p>
      <p>Tu solicitud de ausencia ha sido <strong>${data.approved ? 'aprobada' : 'rechazada'}</strong>.</p>
      <ul>
        <li><strong>Tipo:</strong> ${data.leaveType}</li>
        <li><strong>Fechas:</strong> ${data.startDate} - ${data.endDate}</li>
        <li><strong>Días:</strong> ${data.totalDays}</li>
        ${data.reviewedBy ? `<li><strong>Revisado por:</strong> ${data.reviewedBy}</li>` : ''}
      </ul>
      ${data.notes ? `<p><strong>Notas:</strong> ${data.notes}</p>` : ''}
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/time-off" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Ver ausencias
        </a>
      </p>
      <p>— El equipo de Uplift</p>
    `,
    text: (data) => `Solicitud de ausencia ${data.approved ? 'aprobada' : 'rechazada'}\n\nHola ${data.firstName},\n\nTu solicitud de ausencia ha sido ${data.approved ? 'aprobada' : 'rechazada'}.\n\nTipo: ${data.leaveType}\nFechas: ${data.startDate} - ${data.endDate}\nDías: ${data.totalDays}\n${data.reviewedBy ? `Revisado por: ${data.reviewedBy}\n` : ''}${data.notes ? `Notas: ${data.notes}\n` : ''}\nVer detalles: ${APP_URL}/time-off\n\n— El equipo de Uplift`,
  },

  payslip_available: {
    subject: (data) => `Tu nómina de ${data.payPeriod} está disponible`,
    html: (data) => `
      <h2>Nómina disponible</h2>
      <p>Hola ${data.firstName},</p>
      <p>Tu nómina de <strong>${data.payPeriod}</strong> ya está disponible.</p>
      <ul>
        <li><strong>Fecha de pago:</strong> ${data.payDate}</li>
        <li><strong>Salario neto:</strong> ${data.currency} ${data.netPay}</li>
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/payslips" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Ver nómina
        </a>
      </p>
      <p>— El equipo de Uplift</p>
    `,
    text: (data) => `Nómina disponible\n\nHola ${data.firstName},\n\nTu nómina de ${data.payPeriod} ya está disponible.\n\nFecha de pago: ${data.payDate}\nSalario neto: ${data.currency} ${data.netPay}\n\nVer nómina: ${APP_URL}/payslips\n\n— El equipo de Uplift`,
  },

  review_assigned: {
    subject: 'Evaluación de desempeño asignada',
    html: (data) => `
      <h2>Evaluación de desempeño asignada</h2>
      <p>Hola ${data.firstName},</p>
      <p>Se te ha asignado una evaluación de desempeño${data.reviewee ? ` para <strong>${data.reviewee}</strong>` : ''}.</p>
      <ul>
        <li><strong>Tipo:</strong> ${data.reviewType}</li>
        <li><strong>Fecha límite:</strong> ${data.dueDate}</li>
        ${data.reviewPeriod ? `<li><strong>Período de evaluación:</strong> ${data.reviewPeriod}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/performance/reviews/${data.reviewId || ''}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Iniciar evaluación
        </a>
      </p>
      <p>— El equipo de Uplift</p>
    `,
    text: (data) => `Evaluación de desempeño asignada\n\nHola ${data.firstName},\n\nSe te ha asignado una evaluación de desempeño${data.reviewee ? ` para ${data.reviewee}` : ''}.\n\nTipo: ${data.reviewType}\nFecha límite: ${data.dueDate}\n${data.reviewPeriod ? `Período de evaluación: ${data.reviewPeriod}\n` : ''}\nIniciar: ${APP_URL}/performance/reviews/${data.reviewId || ''}\n\n— El equipo de Uplift`,
  },

  course_assigned: {
    subject: (data) => `Nuevo curso de formación asignado: ${data.courseName}`,
    html: (data) => `
      <h2>Curso de formación asignado</h2>
      <p>Hola ${data.firstName},</p>
      <p>Se te ha asignado un nuevo curso de formación:</p>
      <ul>
        <li><strong>Curso:</strong> ${data.courseName}</li>
        ${data.description ? `<li><strong>Descripción:</strong> ${data.description}</li>` : ''}
        <li><strong>Fecha límite:</strong> ${data.dueDate}</li>
        ${data.estimatedDuration ? `<li><strong>Duración estimada:</strong> ${data.estimatedDuration}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/learning/courses/${data.courseId || ''}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Iniciar curso
        </a>
      </p>
      <p>— El equipo de Uplift</p>
    `,
    text: (data) => `Curso de formación asignado\n\nHola ${data.firstName},\n\nSe te ha asignado un nuevo curso de formación:\n\nCurso: ${data.courseName}\n${data.description ? `Descripción: ${data.description}\n` : ''}Fecha límite: ${data.dueDate}\n${data.estimatedDuration ? `Duración estimada: ${data.estimatedDuration}\n` : ''}\nIniciar: ${APP_URL}/learning/courses/${data.courseId || ''}\n\n— El equipo de Uplift`,
  },

  recognition_received: {
    subject: (data) => `¡${data.senderName} te ha enviado un reconocimiento!`,
    html: (data) => `
      <h2>¡Has sido reconocido/a!</h2>
      <p>Hola ${data.firstName},</p>
      <p><strong>${data.senderName}</strong> te ha reconocido por tu excelente trabajo!</p>
      ${data.badge ? `<p style="text-align: center; font-size: 48px;">${data.badge}</p>` : ''}
      ${data.message ? `<blockquote style="border-left: 4px solid #F26522; padding-left: 16px; margin: 20px 0; font-style: italic;">"${data.message}"</blockquote>` : ''}
      ${data.points ? `<p><strong>Puntos ganados:</strong> ${data.points}</p>` : ''}
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/recognition" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Ver reconocimiento
        </a>
      </p>
      <p>— El equipo de Uplift</p>
    `,
    text: (data) => `¡Has sido reconocido/a!\n\nHola ${data.firstName},\n\n${data.senderName} te ha reconocido por tu excelente trabajo!\n\n${data.message ? `"${data.message}"\n\n` : ''}${data.points ? `Puntos ganados: ${data.points}\n` : ''}\nVer: ${APP_URL}/recognition\n\n— El equipo de Uplift`,
  },

  expense_decision: {
    subject: (data) => `Tu solicitud de gastos ha sido ${data.approved ? 'aprobada' : 'rechazada'}`,
    html: (data) => `
      <h2>Solicitud de gastos ${data.approved ? 'aprobada' : 'rechazada'}</h2>
      <p>Hola ${data.firstName},</p>
      <p>Tu solicitud de gastos ha sido <strong>${data.approved ? 'aprobada' : 'rechazada'}</strong>.</p>
      <ul>
        <li><strong>Descripción:</strong> ${data.description}</li>
        <li><strong>Importe:</strong> ${data.currency} ${data.amount}</li>
        <li><strong>Enviado:</strong> ${data.submittedDate}</li>
        ${data.reviewedBy ? `<li><strong>Revisado por:</strong> ${data.reviewedBy}</li>` : ''}
      </ul>
      ${data.notes ? `<p><strong>Notas:</strong> ${data.notes}</p>` : ''}
      ${data.approved ? `<p>El importe se incluirá en tu próxima nómina.</p>` : ''}
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/expenses" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Ver gastos
        </a>
      </p>
      <p>— El equipo de Uplift</p>
    `,
    text: (data) => `Solicitud de gastos ${data.approved ? 'aprobada' : 'rechazada'}\n\nHola ${data.firstName},\n\nTu solicitud de gastos ha sido ${data.approved ? 'aprobada' : 'rechazada'}.\n\nDescripción: ${data.description}\nImporte: ${data.currency} ${data.amount}\nEnviado: ${data.submittedDate}\n${data.reviewedBy ? `Revisado por: ${data.reviewedBy}\n` : ''}${data.notes ? `Notas: ${data.notes}\n` : ''}${data.approved ? `\nEl importe se incluirá en tu próxima nómina.\n` : ''}\nVer: ${APP_URL}/expenses\n\n— El equipo de Uplift`,
  },

  document_signature_required: {
    subject: (data) => `Documento requiere tu firma: ${data.documentName}`,
    html: (data) => `
      <h2>Firma requerida</h2>
      <p>Hola ${data.firstName},</p>
      <p>Un documento requiere tu firma:</p>
      <ul>
        <li><strong>Documento:</strong> ${data.documentName}</li>
        ${data.description ? `<li><strong>Descripción:</strong> ${data.description}</li>` : ''}
        ${data.requestedBy ? `<li><strong>Solicitado por:</strong> ${data.requestedBy}</li>` : ''}
        ${data.dueDate ? `<li><strong>Fecha límite:</strong> ${data.dueDate}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/documents/${data.documentId || ''}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Revisar y firmar
        </a>
      </p>
      <p>— El equipo de Uplift</p>
    `,
    text: (data) => `Firma requerida\n\nHola ${data.firstName},\n\nUn documento requiere tu firma:\n\nDocumento: ${data.documentName}\n${data.description ? `Descripción: ${data.description}\n` : ''}${data.requestedBy ? `Solicitado por: ${data.requestedBy}\n` : ''}${data.dueDate ? `Fecha límite: ${data.dueDate}\n` : ''}\nRevisar y firmar: ${APP_URL}/documents/${data.documentId || ''}\n\n— El equipo de Uplift`,
  },
};
