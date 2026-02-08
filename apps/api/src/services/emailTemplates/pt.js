// ============================================================
// EMAIL TEMPLATES - Portuguese (pt)
// ============================================================

const APP_URL = process.env.APP_URL || 'https://app.uplifthq.co.uk';

export default {
  password_changed: {
    subject: 'Sua senha do Uplift foi alterada',
    html: (data) => `
      <h2>Senha alterada</h2>
      <p>Olá ${data.firstName},</p>
      <p>A senha da sua conta Uplift foi alterada em ${data.timestamp || new Date().toLocaleString('pt-BR')}.</p>
      <p><strong>Dispositivo:</strong> ${data.device || 'Desconhecido'}</p>
      <p><strong>Endereço IP:</strong> ${data.ipAddress || 'Desconhecido'}</p>
      <p>Se você não fez essa alteração, entre em contato imediatamente com o administrador e redefina sua senha.</p>
      <p>— Equipe Uplift</p>
    `,
    text: (data) => `Senha alterada\n\nOlá ${data.firstName},\n\nA senha da sua conta Uplift foi alterada em ${data.timestamp || new Date().toLocaleString('pt-BR')}.\n\nDispositivo: ${data.device || 'Desconhecido'}\nEndereço IP: ${data.ipAddress || 'Desconhecido'}\n\nSe você não fez essa alteração, entre em contato imediatamente com o administrador.\n\n— Equipe Uplift`,
  },

  new_device_login: {
    subject: 'Novo login na sua conta Uplift',
    html: (data) => `
      <h2>Novo login detectado</h2>
      <p>Olá ${data.firstName},</p>
      <p>Detectamos um novo login na sua conta Uplift:</p>
      <ul>
        <li><strong>Dispositivo:</strong> ${data.device || 'Desconhecido'}</li>
        <li><strong>Navegador:</strong> ${data.browser || 'Desconhecido'}</li>
        <li><strong>Localização:</strong> ${data.location || 'Desconhecida'}</li>
        <li><strong>Endereço IP:</strong> ${data.ipAddress || 'Desconhecido'}</li>
        <li><strong>Horário:</strong> ${data.timestamp || new Date().toLocaleString('pt-BR')}</li>
      </ul>
      <p>Se foi você, pode ignorar este e-mail. Se não reconhece esta atividade, altere sua senha imediatamente.</p>
      <p>— Equipe Uplift</p>
    `,
    text: (data) => `Novo login detectado\n\nOlá ${data.firstName},\n\nDetectamos um novo login na sua conta Uplift:\n\nDispositivo: ${data.device || 'Desconhecido'}\nNavegador: ${data.browser || 'Desconhecido'}\nLocalização: ${data.location || 'Desconhecida'}\nEndereço IP: ${data.ipAddress || 'Desconhecido'}\nHorário: ${data.timestamp || new Date().toLocaleString('pt-BR')}\n\n— Equipe Uplift`,
  },

  account_locked: {
    subject: 'Sua conta Uplift foi bloqueada',
    html: (data) => `
      <h2>Conta bloqueada</h2>
      <p>Olá ${data.firstName},</p>
      <p>Sua conta Uplift foi temporariamente bloqueada devido a múltiplas tentativas de login malsucedidas.</p>
      <p>Sua conta será desbloqueada automaticamente em <strong>30 minutos</strong>.</p>
      <p>Se precisar de acesso imediato, entre em contato com o administrador.</p>
      <p>— Equipe Uplift</p>
    `,
    text: (data) => `Conta bloqueada\n\nOlá ${data.firstName},\n\nSua conta Uplift foi temporariamente bloqueada devido a múltiplas tentativas de login malsucedidas.\n\nSua conta será desbloqueada automaticamente em 30 minutos.\n\n— Equipe Uplift`,
  },

  account_unlocked: {
    subject: 'Sua conta Uplift foi desbloqueada',
    html: (data) => `
      <h2>Conta desbloqueada</h2>
      <p>Olá ${data.firstName},</p>
      <p>Sua conta Uplift foi desbloqueada por um administrador. Você já pode fazer login.</p>
      <p>Se esqueceu sua senha, use o link "Esqueci minha senha" na página de login.</p>
      <p>— Equipe Uplift</p>
    `,
    text: (data) => `Conta desbloqueada\n\nOlá ${data.firstName},\n\nSua conta Uplift foi desbloqueada. Você já pode fazer login.\n\n— Equipe Uplift`,
  },

  password_reset_required: {
    subject: 'Redefinição de senha necessária para sua conta Uplift',
    html: (data) => `
      <h2>Redefinição de senha necessária</h2>
      <p>Olá ${data.firstName},</p>
      <p>Um administrador solicitou que você altere sua senha no próximo login.</p>
      <p>Por favor, faça login no Uplift e defina uma nova senha.</p>
      <p>— Equipe Uplift</p>
    `,
    text: (data) => `Redefinição de senha necessária\n\nOlá ${data.firstName},\n\nUm administrador solicitou que você altere sua senha no próximo login.\n\n— Equipe Uplift`,
  },

  invitation: {
    subject: 'Você foi convidado(a) para o Uplift',
    html: (data) => `
      <h2>Você foi convidado(a)!</h2>
      <p>Olá ${data.firstName},</p>
      <p><strong>${data.invitedBy?.first_name} ${data.invitedBy?.last_name}</strong> convidou você para fazer parte da equipe no Uplift.</p>
      <p>Clique no botão abaixo para aceitar o convite e configurar sua conta:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/accept-invitation?token=${data.invitationToken}"
           style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Aceitar convite
        </a>
      </p>
      <p>Este convite expira em 7 dias.</p>
      <p>— Equipe Uplift</p>
    `,
    text: (data) => `Você foi convidado(a)!\n\nOlá ${data.firstName},\n\n${data.invitedBy?.first_name} ${data.invitedBy?.last_name} convidou você para fazer parte da equipe no Uplift.\n\nAceitar convite: ${APP_URL}/accept-invitation?token=${data.invitationToken}\n\nEste convite expira em 7 dias.\n\n— Equipe Uplift`,
  },

  password_reset: {
    subject: 'Redefinir sua senha do Uplift',
    html: (data) => `
      <h2>Redefinir senha</h2>
      <p>Olá ${data.firstName},</p>
      <p>Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para definir uma nova senha:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/reset-password?token=${data.resetToken}"
           style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Redefinir senha
        </a>
      </p>
      <p>Este link expira em 1 hora.</p>
      <p>Se você não solicitou isso, pode ignorar este e-mail.</p>
      <p>— Equipe Uplift</p>
    `,
    text: (data) => `Redefinir senha\n\nOlá ${data.firstName},\n\nRecebemos uma solicitação para redefinir sua senha.\n\nRedefinir senha: ${APP_URL}/reset-password?token=${data.resetToken}\n\nEste link expira em 1 hora.\n\n— Equipe Uplift`,
  },

  deletion_requested: {
    subject: 'Solicitação de exclusão de conta recebida',
    html: (data) => `
      <h2>Exclusão de conta solicitada</h2>
      <p>Olá ${data.firstName},</p>
      <p>Recebemos sua solicitação para excluir sua conta Uplift.</p>
      <p>Sua conta e todos os dados associados serão excluídos permanentemente em <strong>30 dias</strong>.</p>
      <p>Se mudar de ideia, você pode cancelar esta solicitação fazendo login na sua conta.</p>
      <p>— Equipe Uplift</p>
    `,
    text: (data) => `Exclusão de conta solicitada\n\nOlá ${data.firstName},\n\nRecebemos sua solicitação para excluir sua conta Uplift.\n\nSua conta será excluída permanentemente em 30 dias.\n\n— Equipe Uplift`,
  },

  email_verification: {
    subject: 'Verifique seu e-mail do Uplift',
    html: (data) => `
      <h2>Verifique seu e-mail</h2>
      <p>Olá ${data.firstName},</p>
      <p>Por favor, verifique seu endereço de e-mail clicando no botão abaixo:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/verify-email?token=${data.verificationToken}"
           style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Verificar e-mail
        </a>
      </p>
      <p>Este link expira em 24 horas.</p>
      <p>— Equipe Uplift</p>
    `,
    text: (data) => `Verifique seu e-mail\n\nOlá ${data.firstName},\n\nPor favor, verifique seu e-mail: ${APP_URL}/verify-email?token=${data.verificationToken}\n\nEste link expira em 24 horas.\n\n— Equipe Uplift`,
  },

  account_deactivated: {
    subject: 'Sua conta Uplift foi desativada',
    html: (data) => `
      <h2>Conta desativada</h2>
      <p>Olá ${data.firstName},</p>
      <p>Sua conta Uplift foi desativada por um administrador.</p>
      ${data.reason ? `<p><strong>Motivo:</strong> ${data.reason}</p>` : ''}
      <p>Se você acredita que isso foi um erro, entre em contato com o administrador da sua organização.</p>
      <p>— Equipe Uplift</p>
    `,
    text: (data) => `Conta desativada\n\nOlá ${data.firstName},\n\nSua conta Uplift foi desativada por um administrador.\n\n${data.reason ? `Motivo: ${data.reason}\n\n` : ''}— Equipe Uplift`,
  },

  payment_failed: {
    subject: 'Falha no pagamento da sua assinatura Uplift',
    html: (data) => `
      <h2>Falha no pagamento</h2>
      <p>Olá ${data.firstName},</p>
      <p>Não foi possível processar o pagamento da sua assinatura Uplift.</p>
      <p><strong>Valor:</strong> ${data.currency} ${(data.amount / 100).toFixed(2)}</p>
      <p>Por favor, atualize seu método de pagamento para evitar interrupções no serviço.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.billingPortalUrl}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Atualizar método de pagamento
        </a>
      </p>
      <p>— Equipe Uplift</p>
    `,
    text: (data) => `Falha no pagamento\n\nOlá ${data.firstName},\n\nNão foi possível processar o pagamento da sua assinatura Uplift.\n\nValor: ${data.currency} ${(data.amount / 100).toFixed(2)}\n\nPor favor, atualize seu método de pagamento: ${data.billingPortalUrl}\n\n— Equipe Uplift`,
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
              Ver detalhes
            </a>
          </p>
          ` : ''}
        </div>
      </div>
    `,
    text: (data) => `${data.title}\n\n${data.body}\n\n${data.actionUrl ? `Ver detalhes: ${APP_URL}${data.actionUrl}` : ''}\n\n— Equipe Uplift`,
  },

  // ============================================================
  // MODELOS ESPECÍFICOS DE RH
  // ============================================================

  shift_assigned: {
    subject: 'Novo turno atribuído',
    html: (data) => `
      <h2>Turno atribuído</h2>
      <p>Olá ${data.firstName},</p>
      <p>Um novo turno foi atribuído a você:</p>
      <ul>
        <li><strong>Data:</strong> ${data.shiftDate}</li>
        <li><strong>Horário:</strong> ${data.startTime} - ${data.endTime}</li>
        <li><strong>Local:</strong> ${data.location || 'Consulte a escala para detalhes'}</li>
        ${data.role ? `<li><strong>Função:</strong> ${data.role}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/schedule" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Ver escala
        </a>
      </p>
      <p>— Equipe Uplift</p>
    `,
    text: (data) => `Turno atribuído\n\nOlá ${data.firstName},\n\nUm novo turno foi atribuído a você:\n\nData: ${data.shiftDate}\nHorário: ${data.startTime} - ${data.endTime}\nLocal: ${data.location || 'Consulte a escala para detalhes'}\n${data.role ? `Função: ${data.role}\n` : ''}\nVer escala: ${APP_URL}/schedule\n\n— Equipe Uplift`,
  },

  time_off_decision: {
    subject: (data) => `Sua solicitação de folga foi ${data.approved ? 'aprovada' : 'recusada'}`,
    html: (data) => `
      <h2>Solicitação de folga ${data.approved ? 'aprovada' : 'recusada'}</h2>
      <p>Olá ${data.firstName},</p>
      <p>Sua solicitação de folga foi <strong>${data.approved ? 'aprovada' : 'recusada'}</strong>.</p>
      <ul>
        <li><strong>Tipo:</strong> ${data.leaveType}</li>
        <li><strong>Datas:</strong> ${data.startDate} - ${data.endDate}</li>
        <li><strong>Dias:</strong> ${data.totalDays}</li>
        ${data.reviewedBy ? `<li><strong>Revisado por:</strong> ${data.reviewedBy}</li>` : ''}
      </ul>
      ${data.notes ? `<p><strong>Observações:</strong> ${data.notes}</p>` : ''}
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/time-off" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Ver folgas
        </a>
      </p>
      <p>— Equipe Uplift</p>
    `,
    text: (data) => `Solicitação de folga ${data.approved ? 'aprovada' : 'recusada'}\n\nOlá ${data.firstName},\n\nSua solicitação de folga foi ${data.approved ? 'aprovada' : 'recusada'}.\n\nTipo: ${data.leaveType}\nDatas: ${data.startDate} - ${data.endDate}\nDias: ${data.totalDays}\n${data.reviewedBy ? `Revisado por: ${data.reviewedBy}\n` : ''}${data.notes ? `Observações: ${data.notes}\n` : ''}\nVer detalhes: ${APP_URL}/time-off\n\n— Equipe Uplift`,
  },

  payslip_available: {
    subject: (data) => `Seu holerite de ${data.payPeriod} está disponível`,
    html: (data) => `
      <h2>Holerite disponível</h2>
      <p>Olá ${data.firstName},</p>
      <p>Seu holerite de <strong>${data.payPeriod}</strong> já está disponível.</p>
      <ul>
        <li><strong>Data de pagamento:</strong> ${data.payDate}</li>
        <li><strong>Salário líquido:</strong> ${data.currency} ${data.netPay}</li>
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/payslips" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Ver holerite
        </a>
      </p>
      <p>— Equipe Uplift</p>
    `,
    text: (data) => `Holerite disponível\n\nOlá ${data.firstName},\n\nSeu holerite de ${data.payPeriod} já está disponível.\n\nData de pagamento: ${data.payDate}\nSalário líquido: ${data.currency} ${data.netPay}\n\nVer holerite: ${APP_URL}/payslips\n\n— Equipe Uplift`,
  },

  review_assigned: {
    subject: 'Avaliação de desempenho atribuída',
    html: (data) => `
      <h2>Avaliação de desempenho atribuída</h2>
      <p>Olá ${data.firstName},</p>
      <p>Uma avaliação de desempenho foi atribuída a você${data.reviewee ? ` para <strong>${data.reviewee}</strong>` : ''}.</p>
      <ul>
        <li><strong>Tipo:</strong> ${data.reviewType}</li>
        <li><strong>Prazo:</strong> ${data.dueDate}</li>
        ${data.reviewPeriod ? `<li><strong>Período de avaliação:</strong> ${data.reviewPeriod}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/performance/reviews/${data.reviewId || ''}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Iniciar avaliação
        </a>
      </p>
      <p>— Equipe Uplift</p>
    `,
    text: (data) => `Avaliação de desempenho atribuída\n\nOlá ${data.firstName},\n\nUma avaliação de desempenho foi atribuída a você${data.reviewee ? ` para ${data.reviewee}` : ''}.\n\nTipo: ${data.reviewType}\nPrazo: ${data.dueDate}\n${data.reviewPeriod ? `Período de avaliação: ${data.reviewPeriod}\n` : ''}\nIniciar: ${APP_URL}/performance/reviews/${data.reviewId || ''}\n\n— Equipe Uplift`,
  },

  course_assigned: {
    subject: (data) => `Novo curso de treinamento atribuído: ${data.courseName}`,
    html: (data) => `
      <h2>Curso de treinamento atribuído</h2>
      <p>Olá ${data.firstName},</p>
      <p>Um novo curso de treinamento foi atribuído a você:</p>
      <ul>
        <li><strong>Curso:</strong> ${data.courseName}</li>
        ${data.description ? `<li><strong>Descrição:</strong> ${data.description}</li>` : ''}
        <li><strong>Prazo:</strong> ${data.dueDate}</li>
        ${data.estimatedDuration ? `<li><strong>Duração estimada:</strong> ${data.estimatedDuration}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/learning/courses/${data.courseId || ''}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Iniciar curso
        </a>
      </p>
      <p>— Equipe Uplift</p>
    `,
    text: (data) => `Curso de treinamento atribuído\n\nOlá ${data.firstName},\n\nUm novo curso de treinamento foi atribuído a você:\n\nCurso: ${data.courseName}\n${data.description ? `Descrição: ${data.description}\n` : ''}Prazo: ${data.dueDate}\n${data.estimatedDuration ? `Duração estimada: ${data.estimatedDuration}\n` : ''}\nIniciar: ${APP_URL}/learning/courses/${data.courseId || ''}\n\n— Equipe Uplift`,
  },

  recognition_received: {
    subject: (data) => `${data.senderName} enviou um reconhecimento para você!`,
    html: (data) => `
      <h2>Você foi reconhecido(a)!</h2>
      <p>Olá ${data.firstName},</p>
      <p><strong>${data.senderName}</strong> reconheceu você pelo seu ótimo trabalho!</p>
      ${data.badge ? `<p style="text-align: center; font-size: 48px;">${data.badge}</p>` : ''}
      ${data.message ? `<blockquote style="border-left: 4px solid #F26522; padding-left: 16px; margin: 20px 0; font-style: italic;">"${data.message}"</blockquote>` : ''}
      ${data.points ? `<p><strong>Pontos ganhos:</strong> ${data.points}</p>` : ''}
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/recognition" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Ver reconhecimento
        </a>
      </p>
      <p>— Equipe Uplift</p>
    `,
    text: (data) => `Você foi reconhecido(a)!\n\nOlá ${data.firstName},\n\n${data.senderName} reconheceu você pelo seu ótimo trabalho!\n\n${data.message ? `"${data.message}"\n\n` : ''}${data.points ? `Pontos ganhos: ${data.points}\n` : ''}\nVer: ${APP_URL}/recognition\n\n— Equipe Uplift`,
  },

  expense_decision: {
    subject: (data) => `Sua solicitação de reembolso foi ${data.approved ? 'aprovada' : 'recusada'}`,
    html: (data) => `
      <h2>Solicitação de reembolso ${data.approved ? 'aprovada' : 'recusada'}</h2>
      <p>Olá ${data.firstName},</p>
      <p>Sua solicitação de reembolso foi <strong>${data.approved ? 'aprovada' : 'recusada'}</strong>.</p>
      <ul>
        <li><strong>Descrição:</strong> ${data.description}</li>
        <li><strong>Valor:</strong> ${data.currency} ${data.amount}</li>
        <li><strong>Enviado em:</strong> ${data.submittedDate}</li>
        ${data.reviewedBy ? `<li><strong>Revisado por:</strong> ${data.reviewedBy}</li>` : ''}
      </ul>
      ${data.notes ? `<p><strong>Observações:</strong> ${data.notes}</p>` : ''}
      ${data.approved ? `<p>O valor será incluído no seu próximo pagamento.</p>` : ''}
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/expenses" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Ver despesas
        </a>
      </p>
      <p>— Equipe Uplift</p>
    `,
    text: (data) => `Solicitação de reembolso ${data.approved ? 'aprovada' : 'recusada'}\n\nOlá ${data.firstName},\n\nSua solicitação de reembolso foi ${data.approved ? 'aprovada' : 'recusada'}.\n\nDescrição: ${data.description}\nValor: ${data.currency} ${data.amount}\nEnviado em: ${data.submittedDate}\n${data.reviewedBy ? `Revisado por: ${data.reviewedBy}\n` : ''}${data.notes ? `Observações: ${data.notes}\n` : ''}${data.approved ? `\nO valor será incluído no seu próximo pagamento.\n` : ''}\nVer: ${APP_URL}/expenses\n\n— Equipe Uplift`,
  },

  document_signature_required: {
    subject: (data) => `Documento requer sua assinatura: ${data.documentName}`,
    html: (data) => `
      <h2>Assinatura necessária</h2>
      <p>Olá ${data.firstName},</p>
      <p>Um documento requer sua assinatura:</p>
      <ul>
        <li><strong>Documento:</strong> ${data.documentName}</li>
        ${data.description ? `<li><strong>Descrição:</strong> ${data.description}</li>` : ''}
        ${data.requestedBy ? `<li><strong>Solicitado por:</strong> ${data.requestedBy}</li>` : ''}
        ${data.dueDate ? `<li><strong>Prazo:</strong> ${data.dueDate}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/documents/${data.documentId || ''}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Revisar e assinar
        </a>
      </p>
      <p>— Equipe Uplift</p>
    `,
    text: (data) => `Assinatura necessária\n\nOlá ${data.firstName},\n\nUm documento requer sua assinatura:\n\nDocumento: ${data.documentName}\n${data.description ? `Descrição: ${data.description}\n` : ''}${data.requestedBy ? `Solicitado por: ${data.requestedBy}\n` : ''}${data.dueDate ? `Prazo: ${data.dueDate}\n` : ''}\nRevisar e assinar: ${APP_URL}/documents/${data.documentId || ''}\n\n— Equipe Uplift`,
  },
};
