// ============================================================
// EMAIL TEMPLATES - Polish (pl)
// ============================================================

const APP_URL = process.env.APP_URL || 'https://app.uplifthq.co.uk';

export default {
  password_changed: {
    subject: 'Twoje hasło Uplift zostało zmienione',
    html: (data) => `
      <h2>Hasło zmienione</h2>
      <p>Cześć ${data.firstName},</p>
      <p>Hasło do Twojego konta Uplift zostało zmienione ${data.timestamp || new Date().toLocaleString('pl-PL')}.</p>
      <p><strong>Urządzenie:</strong> ${data.device || 'Nieznane'}</p>
      <p><strong>Adres IP:</strong> ${data.ipAddress || 'Nieznany'}</p>
      <p>Jeśli nie dokonałeś tej zmiany, natychmiast skontaktuj się z administratorem i zresetuj hasło.</p>
      <p>— Zespół Uplift</p>
    `,
    text: (data) => `Hasło zmienione\n\nCześć ${data.firstName},\n\nHasło do Twojego konta Uplift zostało zmienione ${data.timestamp || new Date().toLocaleString('pl-PL')}.\n\nUrządzenie: ${data.device || 'Nieznane'}\nAdres IP: ${data.ipAddress || 'Nieznany'}\n\nJeśli nie dokonałeś tej zmiany, natychmiast skontaktuj się z administratorem.\n\n— Zespół Uplift`,
  },

  new_device_login: {
    subject: 'Nowe logowanie na Twoje konto Uplift',
    html: (data) => `
      <h2>Nowe logowanie</h2>
      <p>Cześć ${data.firstName},</p>
      <p>Wykryliśmy nowe logowanie na Twoje konto Uplift:</p>
      <ul>
        <li><strong>Urządzenie:</strong> ${data.device || 'Nieznane'}</li>
        <li><strong>Przeglądarka:</strong> ${data.browser || 'Nieznana'}</li>
        <li><strong>Lokalizacja:</strong> ${data.location || 'Nieznana'}</li>
        <li><strong>Adres IP:</strong> ${data.ipAddress || 'Nieznany'}</li>
        <li><strong>Czas:</strong> ${data.timestamp || new Date().toLocaleString('pl-PL')}</li>
      </ul>
      <p>Jeśli to byłeś Ty, możesz zignorować tę wiadomość. Jeśli nie rozpoznajesz tej aktywności, natychmiast zmień hasło.</p>
      <p>— Zespół Uplift</p>
    `,
    text: (data) => `Nowe logowanie\n\nCześć ${data.firstName},\n\nWykryliśmy nowe logowanie na Twoje konto Uplift:\n\nUrządzenie: ${data.device || 'Nieznane'}\nPrzeglądarka: ${data.browser || 'Nieznana'}\nLokalizacja: ${data.location || 'Nieznana'}\nAdres IP: ${data.ipAddress || 'Nieznany'}\nCzas: ${data.timestamp || new Date().toLocaleString('pl-PL')}\n\n— Zespół Uplift`,
  },

  account_locked: {
    subject: 'Twoje konto Uplift zostało zablokowane',
    html: (data) => `
      <h2>Konto zablokowane</h2>
      <p>Cześć ${data.firstName},</p>
      <p>Twoje konto Uplift zostało tymczasowo zablokowane z powodu wielu nieudanych prób logowania.</p>
      <p>Twoje konto zostanie automatycznie odblokowane za <strong>30 minut</strong>.</p>
      <p>Jeśli potrzebujesz natychmiastowego dostępu, skontaktuj się z administratorem.</p>
      <p>— Zespół Uplift</p>
    `,
    text: (data) => `Konto zablokowane\n\nCześć ${data.firstName},\n\nTwoje konto Uplift zostało tymczasowo zablokowane z powodu wielu nieudanych prób logowania.\n\nTwoje konto zostanie automatycznie odblokowane za 30 minut.\n\n— Zespół Uplift`,
  },

  account_unlocked: {
    subject: 'Twoje konto Uplift zostało odblokowane',
    html: (data) => `
      <h2>Konto odblokowane</h2>
      <p>Cześć ${data.firstName},</p>
      <p>Twoje konto Uplift zostało odblokowane przez administratora. Możesz się teraz zalogować.</p>
      <p>Jeśli zapomniałeś hasła, użyj linku „Zapomniałem hasła" na stronie logowania.</p>
      <p>— Zespół Uplift</p>
    `,
    text: (data) => `Konto odblokowane\n\nCześć ${data.firstName},\n\nTwoje konto Uplift zostało odblokowane. Możesz się teraz zalogować.\n\n— Zespół Uplift`,
  },

  password_reset_required: {
    subject: 'Wymagana zmiana hasła do konta Uplift',
    html: (data) => `
      <h2>Wymagana zmiana hasła</h2>
      <p>Cześć ${data.firstName},</p>
      <p>Administrator wymaga zmiany hasła przy następnym logowaniu.</p>
      <p>Zaloguj się do Uplift i ustaw nowe hasło.</p>
      <p>— Zespół Uplift</p>
    `,
    text: (data) => `Wymagana zmiana hasła\n\nCześć ${data.firstName},\n\nAdministrator wymaga zmiany hasła przy następnym logowaniu.\n\n— Zespół Uplift`,
  },

  invitation: {
    subject: 'Zostałeś zaproszony do Uplift',
    html: (data) => `
      <h2>Masz zaproszenie!</h2>
      <p>Cześć ${data.firstName},</p>
      <p><strong>${data.invitedBy?.first_name} ${data.invitedBy?.last_name}</strong> zaprasza Cię do swojego zespołu w Uplift.</p>
      <p>Kliknij przycisk poniżej, aby przyjąć zaproszenie i skonfigurować konto:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/accept-invitation?token=${data.invitationToken}"
           style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Przyjmij zaproszenie
        </a>
      </p>
      <p>To zaproszenie wygasa za 7 dni.</p>
      <p>— Zespół Uplift</p>
    `,
    text: (data) => `Masz zaproszenie!\n\nCześć ${data.firstName},\n\n${data.invitedBy?.first_name} ${data.invitedBy?.last_name} zaprasza Cię do swojego zespołu w Uplift.\n\nPrzyjmij zaproszenie: ${APP_URL}/accept-invitation?token=${data.invitationToken}\n\nTo zaproszenie wygasa za 7 dni.\n\n— Zespół Uplift`,
  },

  password_reset: {
    subject: 'Zresetuj hasło do Uplift',
    html: (data) => `
      <h2>Reset hasła</h2>
      <p>Cześć ${data.firstName},</p>
      <p>Otrzymaliśmy prośbę o reset hasła. Kliknij przycisk poniżej, aby ustawić nowe hasło:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/reset-password?token=${data.resetToken}"
           style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Zresetuj hasło
        </a>
      </p>
      <p>Ten link wygasa za 1 godzinę.</p>
      <p>Jeśli nie prosiłeś o reset, możesz zignorować tę wiadomość.</p>
      <p>— Zespół Uplift</p>
    `,
    text: (data) => `Reset hasła\n\nCześć ${data.firstName},\n\nOtrzymaliśmy prośbę o reset hasła.\n\nZresetuj hasło: ${APP_URL}/reset-password?token=${data.resetToken}\n\nTen link wygasa za 1 godzinę.\n\n— Zespół Uplift`,
  },

  deletion_requested: {
    subject: 'Otrzymano prośbę o usunięcie konta',
    html: (data) => `
      <h2>Żądanie usunięcia konta</h2>
      <p>Cześć ${data.firstName},</p>
      <p>Otrzymaliśmy Twoją prośbę o usunięcie konta Uplift.</p>
      <p>Twoje konto i wszystkie powiązane dane zostaną trwale usunięte za <strong>30 dni</strong>.</p>
      <p>Jeśli zmienisz zdanie, możesz anulować tę prośbę, logując się na swoje konto.</p>
      <p>— Zespół Uplift</p>
    `,
    text: (data) => `Żądanie usunięcia konta\n\nCześć ${data.firstName},\n\nOtrzymaliśmy Twoją prośbę o usunięcie konta Uplift.\n\nTwoje konto zostanie trwale usunięte za 30 dni.\n\n— Zespół Uplift`,
  },

  email_verification: {
    subject: 'Zweryfikuj swój adres e-mail Uplift',
    html: (data) => `
      <h2>Zweryfikuj e-mail</h2>
      <p>Cześć ${data.firstName},</p>
      <p>Zweryfikuj swój adres e-mail, klikając przycisk poniżej:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/verify-email?token=${data.verificationToken}"
           style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Zweryfikuj e-mail
        </a>
      </p>
      <p>Ten link wygasa za 24 godziny.</p>
      <p>— Zespół Uplift</p>
    `,
    text: (data) => `Zweryfikuj e-mail\n\nCześć ${data.firstName},\n\nZweryfikuj swój e-mail: ${APP_URL}/verify-email?token=${data.verificationToken}\n\nTen link wygasa za 24 godziny.\n\n— Zespół Uplift`,
  },

  account_deactivated: {
    subject: 'Twoje konto Uplift zostało dezaktywowane',
    html: (data) => `
      <h2>Konto dezaktywowane</h2>
      <p>Cześć ${data.firstName},</p>
      <p>Twoje konto Uplift zostało dezaktywowane przez administratora.</p>
      ${data.reason ? `<p><strong>Powód:</strong> ${data.reason}</p>` : ''}
      <p>Jeśli uważasz, że to pomyłka, skontaktuj się z administratorem swojej organizacji.</p>
      <p>— Zespół Uplift</p>
    `,
    text: (data) => `Konto dezaktywowane\n\nCześć ${data.firstName},\n\nTwoje konto Uplift zostało dezaktywowane przez administratora.\n\n${data.reason ? `Powód: ${data.reason}\n\n` : ''}— Zespół Uplift`,
  },

  payment_failed: {
    subject: 'Płatność za subskrypcję Uplift nie powiodła się',
    html: (data) => `
      <h2>Płatność nie powiodła się</h2>
      <p>Cześć ${data.firstName},</p>
      <p>Nie udało się przetworzyć płatności za subskrypcję Uplift.</p>
      <p><strong>Kwota:</strong> ${data.currency} ${(data.amount / 100).toFixed(2)}</p>
      <p>Zaktualizuj metodę płatności, aby uniknąć przerw w usłudze.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.billingPortalUrl}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Zaktualizuj metodę płatności
        </a>
      </p>
      <p>— Zespół Uplift</p>
    `,
    text: (data) => `Płatność nie powiodła się\n\nCześć ${data.firstName},\n\nNie udało się przetworzyć płatności za subskrypcję Uplift.\n\nKwota: ${data.currency} ${(data.amount / 100).toFixed(2)}\n\nZaktualizuj metodę płatności: ${data.billingPortalUrl}\n\n— Zespół Uplift`,
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
              Zobacz szczegóły
            </a>
          </p>
          ` : ''}
        </div>
      </div>
    `,
    text: (data) => `${data.title}\n\n${data.body}\n\n${data.actionUrl ? `Zobacz szczegóły: ${APP_URL}${data.actionUrl}` : ''}\n\n— Zespół Uplift`,
  },

  // ============================================================
  // SZABLONY SPECYFICZNE DLA HR
  // ============================================================

  shift_assigned: {
    subject: 'Przypisano nową zmianę',
    html: (data) => `
      <h2>Zmiana przypisana</h2>
      <p>Cześć ${data.firstName},</p>
      <p>Przypisano Ci nową zmianę:</p>
      <ul>
        <li><strong>Data:</strong> ${data.shiftDate}</li>
        <li><strong>Godziny:</strong> ${data.startTime} - ${data.endTime}</li>
        <li><strong>Lokalizacja:</strong> ${data.location || 'Zobacz harmonogram po szczegóły'}</li>
        ${data.role ? `<li><strong>Rola:</strong> ${data.role}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/schedule" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Zobacz harmonogram
        </a>
      </p>
      <p>— Zespół Uplift</p>
    `,
    text: (data) => `Zmiana przypisana\n\nCześć ${data.firstName},\n\nPrzypisano Ci nową zmianę:\n\nData: ${data.shiftDate}\nGodziny: ${data.startTime} - ${data.endTime}\nLokalizacja: ${data.location || 'Zobacz harmonogram po szczegóły'}\n${data.role ? `Rola: ${data.role}\n` : ''}\nZobacz harmonogram: ${APP_URL}/schedule\n\n— Zespół Uplift`,
  },

  time_off_decision: {
    subject: (data) => `Twój wniosek urlopowy został ${data.approved ? 'zatwierdzony' : 'odrzucony'}`,
    html: (data) => `
      <h2>Wniosek urlopowy ${data.approved ? 'zatwierdzony' : 'odrzucony'}</h2>
      <p>Cześć ${data.firstName},</p>
      <p>Twój wniosek urlopowy został <strong>${data.approved ? 'zatwierdzony' : 'odrzucony'}</strong>.</p>
      <ul>
        <li><strong>Typ:</strong> ${data.leaveType}</li>
        <li><strong>Daty:</strong> ${data.startDate} - ${data.endDate}</li>
        <li><strong>Dni:</strong> ${data.totalDays}</li>
        ${data.reviewedBy ? `<li><strong>Sprawdzone przez:</strong> ${data.reviewedBy}</li>` : ''}
      </ul>
      ${data.notes ? `<p><strong>Uwagi:</strong> ${data.notes}</p>` : ''}
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/time-off" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Zobacz urlopy
        </a>
      </p>
      <p>— Zespół Uplift</p>
    `,
    text: (data) => `Wniosek urlopowy ${data.approved ? 'zatwierdzony' : 'odrzucony'}\n\nCześć ${data.firstName},\n\nTwój wniosek urlopowy został ${data.approved ? 'zatwierdzony' : 'odrzucony'}.\n\nTyp: ${data.leaveType}\nDaty: ${data.startDate} - ${data.endDate}\nDni: ${data.totalDays}\n${data.reviewedBy ? `Sprawdzone przez: ${data.reviewedBy}\n` : ''}${data.notes ? `Uwagi: ${data.notes}\n` : ''}\nZobacz szczegóły: ${APP_URL}/time-off\n\n— Zespół Uplift`,
  },

  payslip_available: {
    subject: (data) => `Twój pasek wypłaty za ${data.payPeriod} jest dostępny`,
    html: (data) => `
      <h2>Pasek wypłaty dostępny</h2>
      <p>Cześć ${data.firstName},</p>
      <p>Twój pasek wypłaty za <strong>${data.payPeriod}</strong> jest teraz dostępny.</p>
      <ul>
        <li><strong>Data wypłaty:</strong> ${data.payDate}</li>
        <li><strong>Kwota netto:</strong> ${data.currency} ${data.netPay}</li>
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/payslips" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Zobacz pasek wypłaty
        </a>
      </p>
      <p>— Zespół Uplift</p>
    `,
    text: (data) => `Pasek wypłaty dostępny\n\nCześć ${data.firstName},\n\nTwój pasek wypłaty za ${data.payPeriod} jest teraz dostępny.\n\nData wypłaty: ${data.payDate}\nKwota netto: ${data.currency} ${data.netPay}\n\nZobacz pasek: ${APP_URL}/payslips\n\n— Zespół Uplift`,
  },

  review_assigned: {
    subject: 'Przypisano ocenę pracowniczą',
    html: (data) => `
      <h2>Ocena pracownicza przypisana</h2>
      <p>Cześć ${data.firstName},</p>
      <p>Przypisano Ci ocenę pracowniczą${data.reviewee ? ` dla <strong>${data.reviewee}</strong>` : ''}.</p>
      <ul>
        <li><strong>Typ:</strong> ${data.reviewType}</li>
        <li><strong>Termin:</strong> ${data.dueDate}</li>
        ${data.reviewPeriod ? `<li><strong>Okres oceny:</strong> ${data.reviewPeriod}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/performance/reviews/${data.reviewId || ''}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Rozpocznij ocenę
        </a>
      </p>
      <p>— Zespół Uplift</p>
    `,
    text: (data) => `Ocena pracownicza przypisana\n\nCześć ${data.firstName},\n\nPrzypisano Ci ocenę pracowniczą${data.reviewee ? ` dla ${data.reviewee}` : ''}.\n\nTyp: ${data.reviewType}\nTermin: ${data.dueDate}\n${data.reviewPeriod ? `Okres oceny: ${data.reviewPeriod}\n` : ''}\nRozpocznij: ${APP_URL}/performance/reviews/${data.reviewId || ''}\n\n— Zespół Uplift`,
  },

  course_assigned: {
    subject: (data) => `Nowy kurs szkoleniowy przypisany: ${data.courseName}`,
    html: (data) => `
      <h2>Kurs szkoleniowy przypisany</h2>
      <p>Cześć ${data.firstName},</p>
      <p>Przypisano Ci nowy kurs szkoleniowy:</p>
      <ul>
        <li><strong>Kurs:</strong> ${data.courseName}</li>
        ${data.description ? `<li><strong>Opis:</strong> ${data.description}</li>` : ''}
        <li><strong>Termin:</strong> ${data.dueDate}</li>
        ${data.estimatedDuration ? `<li><strong>Szacowany czas:</strong> ${data.estimatedDuration}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/learning/courses/${data.courseId || ''}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Rozpocznij kurs
        </a>
      </p>
      <p>— Zespół Uplift</p>
    `,
    text: (data) => `Kurs szkoleniowy przypisany\n\nCześć ${data.firstName},\n\nPrzypisano Ci nowy kurs szkoleniowy:\n\nKurs: ${data.courseName}\n${data.description ? `Opis: ${data.description}\n` : ''}Termin: ${data.dueDate}\n${data.estimatedDuration ? `Szacowany czas: ${data.estimatedDuration}\n` : ''}\nRozpocznij: ${APP_URL}/learning/courses/${data.courseId || ''}\n\n— Zespół Uplift`,
  },

  recognition_received: {
    subject: (data) => `${data.senderName} przesłał Ci wyróżnienie!`,
    html: (data) => `
      <h2>Zostałeś wyróżniony!</h2>
      <p>Cześć ${data.firstName},</p>
      <p><strong>${data.senderName}</strong> wyróżnił Cię za świetną pracę!</p>
      ${data.badge ? `<p style="text-align: center; font-size: 48px;">${data.badge}</p>` : ''}
      ${data.message ? `<blockquote style="border-left: 4px solid #F26522; padding-left: 16px; margin: 20px 0; font-style: italic;">"${data.message}"</blockquote>` : ''}
      ${data.points ? `<p><strong>Zdobyte punkty:</strong> ${data.points}</p>` : ''}
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/recognition" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Zobacz wyróżnienie
        </a>
      </p>
      <p>— Zespół Uplift</p>
    `,
    text: (data) => `Zostałeś wyróżniony!\n\nCześć ${data.firstName},\n\n${data.senderName} wyróżnił Cię za świetną pracę!\n\n${data.message ? `"${data.message}"\n\n` : ''}${data.points ? `Zdobyte punkty: ${data.points}\n` : ''}\nZobacz: ${APP_URL}/recognition\n\n— Zespół Uplift`,
  },

  expense_decision: {
    subject: (data) => `Twój wniosek o zwrot kosztów został ${data.approved ? 'zatwierdzony' : 'odrzucony'}`,
    html: (data) => `
      <h2>Wniosek o zwrot kosztów ${data.approved ? 'zatwierdzony' : 'odrzucony'}</h2>
      <p>Cześć ${data.firstName},</p>
      <p>Twój wniosek o zwrot kosztów został <strong>${data.approved ? 'zatwierdzony' : 'odrzucony'}</strong>.</p>
      <ul>
        <li><strong>Opis:</strong> ${data.description}</li>
        <li><strong>Kwota:</strong> ${data.currency} ${data.amount}</li>
        <li><strong>Złożono:</strong> ${data.submittedDate}</li>
        ${data.reviewedBy ? `<li><strong>Sprawdzone przez:</strong> ${data.reviewedBy}</li>` : ''}
      </ul>
      ${data.notes ? `<p><strong>Uwagi:</strong> ${data.notes}</p>` : ''}
      ${data.approved ? `<p>Kwota zostanie uwzględniona w następnej wypłacie.</p>` : ''}
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/expenses" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Zobacz koszty
        </a>
      </p>
      <p>— Zespół Uplift</p>
    `,
    text: (data) => `Wniosek o zwrot kosztów ${data.approved ? 'zatwierdzony' : 'odrzucony'}\n\nCześć ${data.firstName},\n\nTwój wniosek o zwrot kosztów został ${data.approved ? 'zatwierdzony' : 'odrzucony'}.\n\nOpis: ${data.description}\nKwota: ${data.currency} ${data.amount}\nZłożono: ${data.submittedDate}\n${data.reviewedBy ? `Sprawdzone przez: ${data.reviewedBy}\n` : ''}${data.notes ? `Uwagi: ${data.notes}\n` : ''}${data.approved ? `\nKwota zostanie uwzględniona w następnej wypłacie.\n` : ''}\nZobacz: ${APP_URL}/expenses\n\n— Zespół Uplift`,
  },

  document_signature_required: {
    subject: (data) => `Dokument wymaga Twojego podpisu: ${data.documentName}`,
    html: (data) => `
      <h2>Wymagany podpis</h2>
      <p>Cześć ${data.firstName},</p>
      <p>Dokument wymaga Twojego podpisu:</p>
      <ul>
        <li><strong>Dokument:</strong> ${data.documentName}</li>
        ${data.description ? `<li><strong>Opis:</strong> ${data.description}</li>` : ''}
        ${data.requestedBy ? `<li><strong>Żądane przez:</strong> ${data.requestedBy}</li>` : ''}
        ${data.dueDate ? `<li><strong>Termin:</strong> ${data.dueDate}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/documents/${data.documentId || ''}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Przejrzyj i podpisz
        </a>
      </p>
      <p>— Zespół Uplift</p>
    `,
    text: (data) => `Wymagany podpis\n\nCześć ${data.firstName},\n\nDokument wymaga Twojego podpisu:\n\nDokument: ${data.documentName}\n${data.description ? `Opis: ${data.description}\n` : ''}${data.requestedBy ? `Żądane przez: ${data.requestedBy}\n` : ''}${data.dueDate ? `Termin: ${data.dueDate}\n` : ''}\nPrzejrzyj i podpisz: ${APP_URL}/documents/${data.documentId || ''}\n\n— Zespół Uplift`,
  },
};
