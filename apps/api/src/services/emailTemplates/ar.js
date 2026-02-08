// ============================================================
// EMAIL TEMPLATES - Arabic (ar) - RTL Support
// ============================================================

const APP_URL = process.env.APP_URL || 'https://app.uplifthq.co.uk';

// RTL wrapper for HTML content
const rtlWrap = (content) => `<div dir="rtl" style="text-align: right;">${content}</div>`;

export default {
  password_changed: {
    subject: 'تم تغيير كلمة مرور Uplift الخاصة بك',
    html: (data) => rtlWrap(`
      <h2>تم تغيير كلمة المرور</h2>
      <p>مرحباً ${data.firstName}،</p>
      <p>تم تغيير كلمة مرور حسابك في Uplift في ${data.timestamp || new Date().toLocaleString('ar')}.</p>
      <p><strong>الجهاز:</strong> ${data.device || 'غير معروف'}</p>
      <p><strong>عنوان IP:</strong> ${data.ipAddress || 'غير معروف'}</p>
      <p>إذا لم تقم بهذا التغيير، يرجى الاتصال بالمسؤول فوراً وإعادة تعيين كلمة المرور.</p>
      <p>— فريق Uplift</p>
    `),
    text: (data) => `تم تغيير كلمة المرور\n\nمرحباً ${data.firstName}،\n\nتم تغيير كلمة مرور حسابك في Uplift في ${data.timestamp || new Date().toLocaleString('ar')}.\n\nالجهاز: ${data.device || 'غير معروف'}\nعنوان IP: ${data.ipAddress || 'غير معروف'}\n\nإذا لم تقم بهذا التغيير، يرجى الاتصال بالمسؤول فوراً.\n\n— فريق Uplift`,
  },

  new_device_login: {
    subject: 'تسجيل دخول جديد إلى حسابك في Uplift',
    html: (data) => rtlWrap(`
      <h2>تسجيل دخول من جهاز جديد</h2>
      <p>مرحباً ${data.firstName}،</p>
      <p>لاحظنا تسجيل دخول جديد إلى حسابك في Uplift:</p>
      <ul>
        <li><strong>الجهاز:</strong> ${data.device || 'غير معروف'}</li>
        <li><strong>المتصفح:</strong> ${data.browser || 'غير معروف'}</li>
        <li><strong>الموقع:</strong> ${data.location || 'غير معروف'}</li>
        <li><strong>عنوان IP:</strong> ${data.ipAddress || 'غير معروف'}</li>
        <li><strong>الوقت:</strong> ${data.timestamp || new Date().toLocaleString('ar')}</li>
      </ul>
      <p>إذا كان هذا أنت، يمكنك تجاهل هذا البريد. إذا لم تتعرف على هذا النشاط، يرجى تغيير كلمة المرور فوراً.</p>
      <p>— فريق Uplift</p>
    `),
    text: (data) => `تسجيل دخول من جهاز جديد\n\nمرحباً ${data.firstName}،\n\nلاحظنا تسجيل دخول جديد إلى حسابك في Uplift:\n\nالجهاز: ${data.device || 'غير معروف'}\nالمتصفح: ${data.browser || 'غير معروف'}\nالموقع: ${data.location || 'غير معروف'}\nعنوان IP: ${data.ipAddress || 'غير معروف'}\nالوقت: ${data.timestamp || new Date().toLocaleString('ar')}\n\n— فريق Uplift`,
  },

  account_locked: {
    subject: 'تم قفل حسابك في Uplift',
    html: (data) => rtlWrap(`
      <h2>تم قفل الحساب</h2>
      <p>مرحباً ${data.firstName}،</p>
      <p>تم قفل حسابك في Uplift مؤقتاً بسبب محاولات تسجيل دخول فاشلة متعددة.</p>
      <p>سيتم إلغاء قفل حسابك تلقائياً خلال <strong>30 دقيقة</strong>.</p>
      <p>إذا كنت بحاجة إلى وصول فوري، يرجى الاتصال بالمسؤول.</p>
      <p>— فريق Uplift</p>
    `),
    text: (data) => `تم قفل الحساب\n\nمرحباً ${data.firstName}،\n\nتم قفل حسابك في Uplift مؤقتاً بسبب محاولات تسجيل دخول فاشلة متعددة.\n\nسيتم إلغاء قفل حسابك تلقائياً خلال 30 دقيقة.\n\n— فريق Uplift`,
  },

  account_unlocked: {
    subject: 'تم إلغاء قفل حسابك في Uplift',
    html: (data) => rtlWrap(`
      <h2>تم إلغاء قفل الحساب</h2>
      <p>مرحباً ${data.firstName}،</p>
      <p>تم إلغاء قفل حسابك في Uplift بواسطة المسؤول. يمكنك الآن تسجيل الدخول.</p>
      <p>إذا نسيت كلمة المرور، استخدم رابط "نسيت كلمة المرور" في صفحة تسجيل الدخول.</p>
      <p>— فريق Uplift</p>
    `),
    text: (data) => `تم إلغاء قفل الحساب\n\nمرحباً ${data.firstName}،\n\nتم إلغاء قفل حسابك في Uplift. يمكنك الآن تسجيل الدخول.\n\n— فريق Uplift`,
  },

  password_reset_required: {
    subject: 'مطلوب إعادة تعيين كلمة المرور لحسابك في Uplift',
    html: (data) => rtlWrap(`
      <h2>مطلوب إعادة تعيين كلمة المرور</h2>
      <p>مرحباً ${data.firstName}،</p>
      <p>طلب المسؤول منك تغيير كلمة المرور في تسجيل الدخول التالي.</p>
      <p>يرجى تسجيل الدخول إلى Uplift وتعيين كلمة مرور جديدة.</p>
      <p>— فريق Uplift</p>
    `),
    text: (data) => `مطلوب إعادة تعيين كلمة المرور\n\nمرحباً ${data.firstName}،\n\nطلب المسؤول منك تغيير كلمة المرور في تسجيل الدخول التالي.\n\n— فريق Uplift`,
  },

  invitation: {
    subject: 'تمت دعوتك للانضمام إلى Uplift',
    html: (data) => rtlWrap(`
      <h2>لديك دعوة!</h2>
      <p>مرحباً ${data.firstName}،</p>
      <p><strong>${data.invitedBy?.first_name} ${data.invitedBy?.last_name}</strong> دعاك للانضمام إلى فريقهم في Uplift.</p>
      <p>انقر على الزر أدناه لقبول دعوتك وإعداد حسابك:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/accept-invitation?token=${data.invitationToken}"
           style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          قبول الدعوة
        </a>
      </p>
      <p>ستنتهي صلاحية هذه الدعوة خلال 7 أيام.</p>
      <p>— فريق Uplift</p>
    `),
    text: (data) => `لديك دعوة!\n\nمرحباً ${data.firstName}،\n\n${data.invitedBy?.first_name} ${data.invitedBy?.last_name} دعاك للانضمام إلى فريقهم في Uplift.\n\nقبول الدعوة: ${APP_URL}/accept-invitation?token=${data.invitationToken}\n\nستنتهي صلاحية هذه الدعوة خلال 7 أيام.\n\n— فريق Uplift`,
  },

  password_reset: {
    subject: 'إعادة تعيين كلمة مرور Uplift',
    html: (data) => rtlWrap(`
      <h2>إعادة تعيين كلمة المرور</h2>
      <p>مرحباً ${data.firstName}،</p>
      <p>تلقينا طلباً لإعادة تعيين كلمة المرور. انقر على الزر أدناه لتعيين كلمة مرور جديدة:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/reset-password?token=${data.resetToken}"
           style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          إعادة تعيين كلمة المرور
        </a>
      </p>
      <p>ستنتهي صلاحية هذا الرابط خلال ساعة واحدة.</p>
      <p>إذا لم تطلب هذا، يمكنك تجاهل هذا البريد.</p>
      <p>— فريق Uplift</p>
    `),
    text: (data) => `إعادة تعيين كلمة المرور\n\nمرحباً ${data.firstName}،\n\nتلقينا طلباً لإعادة تعيين كلمة المرور.\n\nإعادة تعيين كلمة المرور: ${APP_URL}/reset-password?token=${data.resetToken}\n\nستنتهي صلاحية هذا الرابط خلال ساعة واحدة.\n\n— فريق Uplift`,
  },

  deletion_requested: {
    subject: 'تم استلام طلب حذف الحساب',
    html: (data) => rtlWrap(`
      <h2>تم طلب حذف الحساب</h2>
      <p>مرحباً ${data.firstName}،</p>
      <p>تلقينا طلبك لحذف حسابك في Uplift.</p>
      <p>سيتم حذف حسابك وجميع البيانات المرتبطة به نهائياً خلال <strong>30 يوماً</strong>.</p>
      <p>إذا غيرت رأيك، يمكنك إلغاء هذا الطلب بتسجيل الدخول إلى حسابك.</p>
      <p>— فريق Uplift</p>
    `),
    text: (data) => `تم طلب حذف الحساب\n\nمرحباً ${data.firstName}،\n\nتلقينا طلبك لحذف حسابك في Uplift.\n\nسيتم حذف حسابك نهائياً خلال 30 يوماً.\n\n— فريق Uplift`,
  },

  email_verification: {
    subject: 'تحقق من بريدك الإلكتروني في Uplift',
    html: (data) => rtlWrap(`
      <h2>تحقق من بريدك الإلكتروني</h2>
      <p>مرحباً ${data.firstName}،</p>
      <p>يرجى التحقق من عنوان بريدك الإلكتروني بالنقر على الزر أدناه:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/verify-email?token=${data.verificationToken}"
           style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          تحقق من البريد الإلكتروني
        </a>
      </p>
      <p>ستنتهي صلاحية هذا الرابط خلال 24 ساعة.</p>
      <p>— فريق Uplift</p>
    `),
    text: (data) => `تحقق من بريدك الإلكتروني\n\nمرحباً ${data.firstName}،\n\nيرجى التحقق من بريدك الإلكتروني: ${APP_URL}/verify-email?token=${data.verificationToken}\n\nستنتهي صلاحية هذا الرابط خلال 24 ساعة.\n\n— فريق Uplift`,
  },

  account_deactivated: {
    subject: 'تم إلغاء تنشيط حسابك في Uplift',
    html: (data) => rtlWrap(`
      <h2>تم إلغاء تنشيط الحساب</h2>
      <p>مرحباً ${data.firstName}،</p>
      <p>تم إلغاء تنشيط حسابك في Uplift بواسطة المسؤول.</p>
      ${data.reason ? `<p><strong>السبب:</strong> ${data.reason}</p>` : ''}
      <p>إذا كنت تعتقد أن هذا خطأ، يرجى الاتصال بمسؤول مؤسستك.</p>
      <p>— فريق Uplift</p>
    `),
    text: (data) => `تم إلغاء تنشيط الحساب\n\nمرحباً ${data.firstName}،\n\nتم إلغاء تنشيط حسابك في Uplift بواسطة المسؤول.\n\n${data.reason ? `السبب: ${data.reason}\n\n` : ''}— فريق Uplift`,
  },

  payment_failed: {
    subject: 'فشل الدفع لاشتراكك في Uplift',
    html: (data) => rtlWrap(`
      <h2>فشل الدفع</h2>
      <p>مرحباً ${data.firstName}،</p>
      <p>لم نتمكن من معالجة دفعتك لاشتراكك في Uplift.</p>
      <p><strong>المبلغ:</strong> ${data.currency} ${(data.amount / 100).toFixed(2)}</p>
      <p>يرجى تحديث طريقة الدفع لتجنب أي انقطاع في الخدمة.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.billingPortalUrl}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          تحديث طريقة الدفع
        </a>
      </p>
      <p>— فريق Uplift</p>
    `),
    text: (data) => `فشل الدفع\n\nمرحباً ${data.firstName}،\n\nلم نتمكن من معالجة دفعتك لاشتراكك في Uplift.\n\nالمبلغ: ${data.currency} ${(data.amount / 100).toFixed(2)}\n\nيرجى تحديث طريقة الدفع: ${data.billingPortalUrl}\n\n— فريق Uplift`,
  },

  notification: {
    subject: (data) => data.title,
    html: (data) => `
      <div dir="rtl" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; text-align: right;">
        <div style="background-color: #F26522; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Uplift</h1>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #1e293b; margin: 0 0 16px 0;">${data.title}</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.6;">${data.body}</p>
          ${data.actionUrl ? `
          <p style="text-align: center; margin: 30px 0;">
            <a href="${APP_URL}${data.actionUrl}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              عرض التفاصيل
            </a>
          </p>
          ` : ''}
        </div>
      </div>
    `,
    text: (data) => `${data.title}\n\n${data.body}\n\n${data.actionUrl ? `عرض التفاصيل: ${APP_URL}${data.actionUrl}` : ''}\n\n— فريق Uplift`,
  },

  // ============================================================
  // قوالب الموارد البشرية
  // ============================================================

  shift_assigned: {
    subject: 'تم تعيين وردية جديدة لك',
    html: (data) => rtlWrap(`
      <h2>تم تعيين الوردية</h2>
      <p>مرحباً ${data.firstName}،</p>
      <p>تم تعيين وردية جديدة لك:</p>
      <ul>
        <li><strong>التاريخ:</strong> ${data.shiftDate}</li>
        <li><strong>الوقت:</strong> ${data.startTime} - ${data.endTime}</li>
        <li><strong>الموقع:</strong> ${data.location || 'راجع الجدول للتفاصيل'}</li>
        ${data.role ? `<li><strong>الدور:</strong> ${data.role}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/schedule" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          عرض الجدول
        </a>
      </p>
      <p>— فريق Uplift</p>
    `),
    text: (data) => `تم تعيين الوردية\n\nمرحباً ${data.firstName}،\n\nتم تعيين وردية جديدة لك:\n\nالتاريخ: ${data.shiftDate}\nالوقت: ${data.startTime} - ${data.endTime}\nالموقع: ${data.location || 'راجع الجدول للتفاصيل'}\n${data.role ? `الدور: ${data.role}\n` : ''}\nعرض الجدول: ${APP_URL}/schedule\n\n— فريق Uplift`,
  },

  time_off_decision: {
    subject: (data) => `تم ${data.approved ? 'الموافقة على' : 'رفض'} طلب إجازتك`,
    html: (data) => rtlWrap(`
      <h2>طلب الإجازة ${data.approved ? 'تمت الموافقة عليه' : 'تم رفضه'}</h2>
      <p>مرحباً ${data.firstName}،</p>
      <p>تم <strong>${data.approved ? 'الموافقة على' : 'رفض'}</strong> طلب إجازتك.</p>
      <ul>
        <li><strong>النوع:</strong> ${data.leaveType}</li>
        <li><strong>التواريخ:</strong> ${data.startDate} - ${data.endDate}</li>
        <li><strong>الأيام:</strong> ${data.totalDays}</li>
        ${data.reviewedBy ? `<li><strong>تمت المراجعة بواسطة:</strong> ${data.reviewedBy}</li>` : ''}
      </ul>
      ${data.notes ? `<p><strong>ملاحظات:</strong> ${data.notes}</p>` : ''}
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/time-off" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          عرض الإجازات
        </a>
      </p>
      <p>— فريق Uplift</p>
    `),
    text: (data) => `طلب الإجازة ${data.approved ? 'تمت الموافقة عليه' : 'تم رفضه'}\n\nمرحباً ${data.firstName}،\n\nتم ${data.approved ? 'الموافقة على' : 'رفض'} طلب إجازتك.\n\nالنوع: ${data.leaveType}\nالتواريخ: ${data.startDate} - ${data.endDate}\nالأيام: ${data.totalDays}\n${data.reviewedBy ? `تمت المراجعة بواسطة: ${data.reviewedBy}\n` : ''}${data.notes ? `ملاحظات: ${data.notes}\n` : ''}\nعرض التفاصيل: ${APP_URL}/time-off\n\n— فريق Uplift`,
  },

  payslip_available: {
    subject: (data) => `كشف راتبك لـ ${data.payPeriod} جاهز`,
    html: (data) => rtlWrap(`
      <h2>كشف الراتب متاح</h2>
      <p>مرحباً ${data.firstName}،</p>
      <p>كشف راتبك لـ <strong>${data.payPeriod}</strong> متاح الآن.</p>
      <ul>
        <li><strong>تاريخ الدفع:</strong> ${data.payDate}</li>
        <li><strong>صافي الراتب:</strong> ${data.currency} ${data.netPay}</li>
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/payslips" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          عرض كشف الراتب
        </a>
      </p>
      <p>— فريق Uplift</p>
    `),
    text: (data) => `كشف الراتب متاح\n\nمرحباً ${data.firstName}،\n\nكشف راتبك لـ ${data.payPeriod} متاح الآن.\n\nتاريخ الدفع: ${data.payDate}\nصافي الراتب: ${data.currency} ${data.netPay}\n\nعرض كشف الراتب: ${APP_URL}/payslips\n\n— فريق Uplift`,
  },

  review_assigned: {
    subject: 'تم تعيين تقييم أداء لك',
    html: (data) => rtlWrap(`
      <h2>تم تعيين تقييم الأداء</h2>
      <p>مرحباً ${data.firstName}،</p>
      <p>تم تعيين تقييم أداء لك${data.reviewee ? ` لـ <strong>${data.reviewee}</strong>` : ''}.</p>
      <ul>
        <li><strong>النوع:</strong> ${data.reviewType}</li>
        <li><strong>تاريخ الاستحقاق:</strong> ${data.dueDate}</li>
        ${data.reviewPeriod ? `<li><strong>فترة التقييم:</strong> ${data.reviewPeriod}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/performance/reviews/${data.reviewId || ''}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          بدء التقييم
        </a>
      </p>
      <p>— فريق Uplift</p>
    `),
    text: (data) => `تم تعيين تقييم الأداء\n\nمرحباً ${data.firstName}،\n\nتم تعيين تقييم أداء لك${data.reviewee ? ` لـ ${data.reviewee}` : ''}.\n\nالنوع: ${data.reviewType}\nتاريخ الاستحقاق: ${data.dueDate}\n${data.reviewPeriod ? `فترة التقييم: ${data.reviewPeriod}\n` : ''}\nبدء التقييم: ${APP_URL}/performance/reviews/${data.reviewId || ''}\n\n— فريق Uplift`,
  },

  course_assigned: {
    subject: (data) => `تم تعيين دورة تدريبية جديدة: ${data.courseName}`,
    html: (data) => rtlWrap(`
      <h2>تم تعيين دورة تدريبية</h2>
      <p>مرحباً ${data.firstName}،</p>
      <p>تم تعيين دورة تدريبية جديدة لك:</p>
      <ul>
        <li><strong>الدورة:</strong> ${data.courseName}</li>
        ${data.description ? `<li><strong>الوصف:</strong> ${data.description}</li>` : ''}
        <li><strong>تاريخ الاستحقاق:</strong> ${data.dueDate}</li>
        ${data.estimatedDuration ? `<li><strong>المدة المقدرة:</strong> ${data.estimatedDuration}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/learning/courses/${data.courseId || ''}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          بدء الدورة
        </a>
      </p>
      <p>— فريق Uplift</p>
    `),
    text: (data) => `تم تعيين دورة تدريبية\n\nمرحباً ${data.firstName}،\n\nتم تعيين دورة تدريبية جديدة لك:\n\nالدورة: ${data.courseName}\n${data.description ? `الوصف: ${data.description}\n` : ''}تاريخ الاستحقاق: ${data.dueDate}\n${data.estimatedDuration ? `المدة المقدرة: ${data.estimatedDuration}\n` : ''}\nبدء الدورة: ${APP_URL}/learning/courses/${data.courseId || ''}\n\n— فريق Uplift`,
  },

  recognition_received: {
    subject: (data) => `أرسل لك ${data.senderName} تقديراً!`,
    html: (data) => rtlWrap(`
      <h2>تم تقديرك!</h2>
      <p>مرحباً ${data.firstName}،</p>
      <p><strong>${data.senderName}</strong> قدّرك على عملك الرائع!</p>
      ${data.badge ? `<p style="text-align: center; font-size: 48px;">${data.badge}</p>` : ''}
      ${data.message ? `<blockquote style="border-right: 4px solid #F26522; padding-right: 16px; margin: 20px 0; font-style: italic;">"${data.message}"</blockquote>` : ''}
      ${data.points ? `<p><strong>النقاط المكتسبة:</strong> ${data.points}</p>` : ''}
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/recognition" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          عرض التقدير
        </a>
      </p>
      <p>— فريق Uplift</p>
    `),
    text: (data) => `تم تقديرك!\n\nمرحباً ${data.firstName}،\n\n${data.senderName} قدّرك على عملك الرائع!\n\n${data.message ? `"${data.message}"\n\n` : ''}${data.points ? `النقاط المكتسبة: ${data.points}\n` : ''}\nعرض: ${APP_URL}/recognition\n\n— فريق Uplift`,
  },

  expense_decision: {
    subject: (data) => `تم ${data.approved ? 'الموافقة على' : 'رفض'} مطالبة المصروفات الخاصة بك`,
    html: (data) => rtlWrap(`
      <h2>مطالبة المصروفات ${data.approved ? 'تمت الموافقة عليها' : 'تم رفضها'}</h2>
      <p>مرحباً ${data.firstName}،</p>
      <p>تم <strong>${data.approved ? 'الموافقة على' : 'رفض'}</strong> مطالبة المصروفات الخاصة بك.</p>
      <ul>
        <li><strong>الوصف:</strong> ${data.description}</li>
        <li><strong>المبلغ:</strong> ${data.currency} ${data.amount}</li>
        <li><strong>تاريخ التقديم:</strong> ${data.submittedDate}</li>
        ${data.reviewedBy ? `<li><strong>تمت المراجعة بواسطة:</strong> ${data.reviewedBy}</li>` : ''}
      </ul>
      ${data.notes ? `<p><strong>ملاحظات:</strong> ${data.notes}</p>` : ''}
      ${data.approved ? `<p>سيتم تضمين المبلغ في راتبك القادم.</p>` : ''}
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/expenses" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          عرض المصروفات
        </a>
      </p>
      <p>— فريق Uplift</p>
    `),
    text: (data) => `مطالبة المصروفات ${data.approved ? 'تمت الموافقة عليها' : 'تم رفضها'}\n\nمرحباً ${data.firstName}،\n\nتم ${data.approved ? 'الموافقة على' : 'رفض'} مطالبة المصروفات الخاصة بك.\n\nالوصف: ${data.description}\nالمبلغ: ${data.currency} ${data.amount}\nتاريخ التقديم: ${data.submittedDate}\n${data.reviewedBy ? `تمت المراجعة بواسطة: ${data.reviewedBy}\n` : ''}${data.notes ? `ملاحظات: ${data.notes}\n` : ''}${data.approved ? `\nسيتم تضمين المبلغ في راتبك القادم.\n` : ''}\nعرض: ${APP_URL}/expenses\n\n— فريق Uplift`,
  },

  document_signature_required: {
    subject: (data) => `المستند يتطلب توقيعك: ${data.documentName}`,
    html: (data) => rtlWrap(`
      <h2>التوقيع مطلوب</h2>
      <p>مرحباً ${data.firstName}،</p>
      <p>مستند يتطلب توقيعك:</p>
      <ul>
        <li><strong>المستند:</strong> ${data.documentName}</li>
        ${data.description ? `<li><strong>الوصف:</strong> ${data.description}</li>` : ''}
        ${data.requestedBy ? `<li><strong>طُلب بواسطة:</strong> ${data.requestedBy}</li>` : ''}
        ${data.dueDate ? `<li><strong>تاريخ الاستحقاق:</strong> ${data.dueDate}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/documents/${data.documentId || ''}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          مراجعة وتوقيع
        </a>
      </p>
      <p>— فريق Uplift</p>
    `),
    text: (data) => `التوقيع مطلوب\n\nمرحباً ${data.firstName}،\n\nمستند يتطلب توقيعك:\n\nالمستند: ${data.documentName}\n${data.description ? `الوصف: ${data.description}\n` : ''}${data.requestedBy ? `طُلب بواسطة: ${data.requestedBy}\n` : ''}${data.dueDate ? `تاريخ الاستحقاق: ${data.dueDate}\n` : ''}\nمراجعة وتوقيع: ${APP_URL}/documents/${data.documentId || ''}\n\n— فريق Uplift`,
  },
};
