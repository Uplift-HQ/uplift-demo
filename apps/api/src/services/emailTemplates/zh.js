// ============================================================
// EMAIL TEMPLATES - Chinese Simplified (zh)
// ============================================================

const APP_URL = process.env.APP_URL || 'https://app.uplifthq.co.uk';

export default {
  password_changed: {
    subject: '您的 Uplift 密码已更改',
    html: (data) => `
      <h2>密码已更改</h2>
      <p>${data.firstName}，您好，</p>
      <p>您的 Uplift 账户密码已于 ${data.timestamp || new Date().toLocaleString('zh-CN')} 更改。</p>
      <p><strong>设备：</strong>${data.device || '未知'}</p>
      <p><strong>IP 地址：</strong>${data.ipAddress || '未知'}</p>
      <p>如果您没有进行此更改，请立即联系管理员并重置密码。</p>
      <p>— Uplift 团队</p>
    `,
    text: (data) => `密码已更改\n\n${data.firstName}，您好，\n\n您的 Uplift 账户密码已于 ${data.timestamp || new Date().toLocaleString('zh-CN')} 更改。\n\n设备：${data.device || '未知'}\nIP 地址：${data.ipAddress || '未知'}\n\n如果您没有进行此更改，请立即联系管理员。\n\n— Uplift 团队`,
  },

  new_device_login: {
    subject: '新设备登录您的 Uplift 账户',
    html: (data) => `
      <h2>新设备登录</h2>
      <p>${data.firstName}，您好，</p>
      <p>我们检测到您的 Uplift 账户有新的登录：</p>
      <ul>
        <li><strong>设备：</strong>${data.device || '未知'}</li>
        <li><strong>浏览器：</strong>${data.browser || '未知'}</li>
        <li><strong>位置：</strong>${data.location || '未知'}</li>
        <li><strong>IP 地址：</strong>${data.ipAddress || '未知'}</li>
        <li><strong>时间：</strong>${data.timestamp || new Date().toLocaleString('zh-CN')}</li>
      </ul>
      <p>如果是您本人操作，可以忽略此邮件。如果您不认识此活动，请立即更改密码。</p>
      <p>— Uplift 团队</p>
    `,
    text: (data) => `新设备登录\n\n${data.firstName}，您好，\n\n我们检测到您的 Uplift 账户有新的登录：\n\n设备：${data.device || '未知'}\n浏览器：${data.browser || '未知'}\n位置：${data.location || '未知'}\nIP 地址：${data.ipAddress || '未知'}\n时间：${data.timestamp || new Date().toLocaleString('zh-CN')}\n\n— Uplift 团队`,
  },

  account_locked: {
    subject: '您的 Uplift 账户已被锁定',
    html: (data) => `
      <h2>账户已锁定</h2>
      <p>${data.firstName}，您好，</p>
      <p>由于多次登录失败，您的 Uplift 账户已被临时锁定。</p>
      <p>您的账户将在 <strong>30 分钟</strong>后自动解锁。</p>
      <p>如需立即访问，请联系管理员。</p>
      <p>— Uplift 团队</p>
    `,
    text: (data) => `账户已锁定\n\n${data.firstName}，您好，\n\n由于多次登录失败，您的 Uplift 账户已被临时锁定。\n\n您的账户将在 30 分钟后自动解锁。\n\n— Uplift 团队`,
  },

  account_unlocked: {
    subject: '您的 Uplift 账户已解锁',
    html: (data) => `
      <h2>账户已解锁</h2>
      <p>${data.firstName}，您好，</p>
      <p>您的 Uplift 账户已被管理员解锁。您现在可以登录了。</p>
      <p>如果您忘记了密码，请使用登录页面上的"忘记密码"链接。</p>
      <p>— Uplift 团队</p>
    `,
    text: (data) => `账户已解锁\n\n${data.firstName}，您好，\n\n您的 Uplift 账户已解锁。您现在可以登录了。\n\n— Uplift 团队`,
  },

  password_reset_required: {
    subject: '您的 Uplift 账户需要重置密码',
    html: (data) => `
      <h2>需要重置密码</h2>
      <p>${data.firstName}，您好，</p>
      <p>管理员要求您在下次登录时更改密码。</p>
      <p>请登录 Uplift 并设置新密码。</p>
      <p>— Uplift 团队</p>
    `,
    text: (data) => `需要重置密码\n\n${data.firstName}，您好，\n\n管理员要求您在下次登录时更改密码。\n\n— Uplift 团队`,
  },

  invitation: {
    subject: '您已被邀请加入 Uplift',
    html: (data) => `
      <h2>您收到了邀请！</h2>
      <p>${data.firstName}，您好，</p>
      <p><strong>${data.invitedBy?.first_name} ${data.invitedBy?.last_name}</strong> 邀请您加入 Uplift 团队。</p>
      <p>点击下方按钮接受邀请并设置您的账户：</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/accept-invitation?token=${data.invitationToken}"
           style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          接受邀请
        </a>
      </p>
      <p>此邀请将在 7 天后过期。</p>
      <p>— Uplift 团队</p>
    `,
    text: (data) => `您收到了邀请！\n\n${data.firstName}，您好，\n\n${data.invitedBy?.first_name} ${data.invitedBy?.last_name} 邀请您加入 Uplift 团队。\n\n接受邀请：${APP_URL}/accept-invitation?token=${data.invitationToken}\n\n此邀请将在 7 天后过期。\n\n— Uplift 团队`,
  },

  password_reset: {
    subject: '重置您的 Uplift 密码',
    html: (data) => `
      <h2>重置密码</h2>
      <p>${data.firstName}，您好，</p>
      <p>我们收到了重置您密码的请求。点击下方按钮设置新密码：</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/reset-password?token=${data.resetToken}"
           style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          重置密码
        </a>
      </p>
      <p>此链接将在 1 小时后过期。</p>
      <p>如果您没有请求此操作，可以忽略此邮件。</p>
      <p>— Uplift 团队</p>
    `,
    text: (data) => `重置密码\n\n${data.firstName}，您好，\n\n我们收到了重置您密码的请求。\n\n重置密码：${APP_URL}/reset-password?token=${data.resetToken}\n\n此链接将在 1 小时后过期。\n\n— Uplift 团队`,
  },

  deletion_requested: {
    subject: '已收到账户删除请求',
    html: (data) => `
      <h2>账户删除请求</h2>
      <p>${data.firstName}，您好，</p>
      <p>我们已收到您删除 Uplift 账户的请求。</p>
      <p>您的账户及所有相关数据将在 <strong>30 天</strong>后永久删除。</p>
      <p>如果您改变主意，可以登录账户取消此请求。</p>
      <p>— Uplift 团队</p>
    `,
    text: (data) => `账户删除请求\n\n${data.firstName}，您好，\n\n我们已收到您删除 Uplift 账户的请求。\n\n您的账户将在 30 天后永久删除。\n\n— Uplift 团队`,
  },

  email_verification: {
    subject: '验证您的 Uplift 电子邮箱',
    html: (data) => `
      <h2>验证邮箱</h2>
      <p>${data.firstName}，您好，</p>
      <p>请点击下方按钮验证您的电子邮箱地址：</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/verify-email?token=${data.verificationToken}"
           style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          验证邮箱
        </a>
      </p>
      <p>此链接将在 24 小时后过期。</p>
      <p>— Uplift 团队</p>
    `,
    text: (data) => `验证邮箱\n\n${data.firstName}，您好，\n\n请验证您的邮箱：${APP_URL}/verify-email?token=${data.verificationToken}\n\n此链接将在 24 小时后过期。\n\n— Uplift 团队`,
  },

  account_deactivated: {
    subject: '您的 Uplift 账户已被停用',
    html: (data) => `
      <h2>账户已停用</h2>
      <p>${data.firstName}，您好，</p>
      <p>您的 Uplift 账户已被管理员停用。</p>
      ${data.reason ? `<p><strong>原因：</strong>${data.reason}</p>` : ''}
      <p>如果您认为这是错误的，请联系您组织的管理员。</p>
      <p>— Uplift 团队</p>
    `,
    text: (data) => `账户已停用\n\n${data.firstName}，您好，\n\n您的 Uplift 账户已被管理员停用。\n\n${data.reason ? `原因：${data.reason}\n\n` : ''}— Uplift 团队`,
  },

  payment_failed: {
    subject: '您的 Uplift 订阅付款失败',
    html: (data) => `
      <h2>付款失败</h2>
      <p>${data.firstName}，您好，</p>
      <p>我们无法处理您的 Uplift 订阅付款。</p>
      <p><strong>金额：</strong>${data.currency} ${(data.amount / 100).toFixed(2)}</p>
      <p>请更新您的付款方式，以避免服务中断。</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.billingPortalUrl}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          更新付款方式
        </a>
      </p>
      <p>— Uplift 团队</p>
    `,
    text: (data) => `付款失败\n\n${data.firstName}，您好，\n\n我们无法处理您的 Uplift 订阅付款。\n\n金额：${data.currency} ${(data.amount / 100).toFixed(2)}\n\n请更新您的付款方式：${data.billingPortalUrl}\n\n— Uplift 团队`,
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
              查看详情
            </a>
          </p>
          ` : ''}
        </div>
      </div>
    `,
    text: (data) => `${data.title}\n\n${data.body}\n\n${data.actionUrl ? `查看详情：${APP_URL}${data.actionUrl}` : ''}\n\n— Uplift 团队`,
  },

  // ============================================================
  // HR 专用模板
  // ============================================================

  shift_assigned: {
    subject: '您有新的排班',
    html: (data) => `
      <h2>排班已分配</h2>
      <p>${data.firstName}，您好，</p>
      <p>您有一个新的排班：</p>
      <ul>
        <li><strong>日期：</strong>${data.shiftDate}</li>
        <li><strong>时间：</strong>${data.startTime} - ${data.endTime}</li>
        <li><strong>地点：</strong>${data.location || '详见排班表'}</li>
        ${data.role ? `<li><strong>职位：</strong>${data.role}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/schedule" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          查看排班
        </a>
      </p>
      <p>— Uplift 团队</p>
    `,
    text: (data) => `排班已分配\n\n${data.firstName}，您好，\n\n您有一个新的排班：\n\n日期：${data.shiftDate}\n时间：${data.startTime} - ${data.endTime}\n地点：${data.location || '详见排班表'}\n${data.role ? `职位：${data.role}\n` : ''}\n查看排班：${APP_URL}/schedule\n\n— Uplift 团队`,
  },

  time_off_decision: {
    subject: (data) => `您的请假申请已${data.approved ? '批准' : '拒绝'}`,
    html: (data) => `
      <h2>请假申请${data.approved ? '已批准' : '已拒绝'}</h2>
      <p>${data.firstName}，您好，</p>
      <p>您的请假申请已<strong>${data.approved ? '批准' : '拒绝'}</strong>。</p>
      <ul>
        <li><strong>类型：</strong>${data.leaveType}</li>
        <li><strong>日期：</strong>${data.startDate} - ${data.endDate}</li>
        <li><strong>天数：</strong>${data.totalDays}</li>
        ${data.reviewedBy ? `<li><strong>审批人：</strong>${data.reviewedBy}</li>` : ''}
      </ul>
      ${data.notes ? `<p><strong>备注：</strong>${data.notes}</p>` : ''}
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/time-off" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          查看休假
        </a>
      </p>
      <p>— Uplift 团队</p>
    `,
    text: (data) => `请假申请${data.approved ? '已批准' : '已拒绝'}\n\n${data.firstName}，您好，\n\n您的请假申请已${data.approved ? '批准' : '拒绝'}。\n\n类型：${data.leaveType}\n日期：${data.startDate} - ${data.endDate}\n天数：${data.totalDays}\n${data.reviewedBy ? `审批人：${data.reviewedBy}\n` : ''}${data.notes ? `备注：${data.notes}\n` : ''}\n查看详情：${APP_URL}/time-off\n\n— Uplift 团队`,
  },

  payslip_available: {
    subject: (data) => `您 ${data.payPeriod} 的工资单已生成`,
    html: (data) => `
      <h2>工资单已生成</h2>
      <p>${data.firstName}，您好，</p>
      <p>您 <strong>${data.payPeriod}</strong> 的工资单已生成。</p>
      <ul>
        <li><strong>发薪日期：</strong>${data.payDate}</li>
        <li><strong>实发金额：</strong>${data.currency} ${data.netPay}</li>
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/payslips" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          查看工资单
        </a>
      </p>
      <p>— Uplift 团队</p>
    `,
    text: (data) => `工资单已生成\n\n${data.firstName}，您好，\n\n您 ${data.payPeriod} 的工资单已生成。\n\n发薪日期：${data.payDate}\n实发金额：${data.currency} ${data.netPay}\n\n查看工资单：${APP_URL}/payslips\n\n— Uplift 团队`,
  },

  review_assigned: {
    subject: '您有一项绩效评估任务',
    html: (data) => `
      <h2>绩效评估已分配</h2>
      <p>${data.firstName}，您好，</p>
      <p>您有一项绩效评估任务${data.reviewee ? `，评估对象：<strong>${data.reviewee}</strong>` : ''}。</p>
      <ul>
        <li><strong>类型：</strong>${data.reviewType}</li>
        <li><strong>截止日期：</strong>${data.dueDate}</li>
        ${data.reviewPeriod ? `<li><strong>评估周期：</strong>${data.reviewPeriod}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/performance/reviews/${data.reviewId || ''}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          开始评估
        </a>
      </p>
      <p>— Uplift 团队</p>
    `,
    text: (data) => `绩效评估已分配\n\n${data.firstName}，您好，\n\n您有一项绩效评估任务${data.reviewee ? `，评估对象：${data.reviewee}` : ''}。\n\n类型：${data.reviewType}\n截止日期：${data.dueDate}\n${data.reviewPeriod ? `评估周期：${data.reviewPeriod}\n` : ''}\n开始评估：${APP_URL}/performance/reviews/${data.reviewId || ''}\n\n— Uplift 团队`,
  },

  course_assigned: {
    subject: (data) => `新培训课程已分配：${data.courseName}`,
    html: (data) => `
      <h2>培训课程已分配</h2>
      <p>${data.firstName}，您好，</p>
      <p>您有一门新的培训课程：</p>
      <ul>
        <li><strong>课程：</strong>${data.courseName}</li>
        ${data.description ? `<li><strong>描述：</strong>${data.description}</li>` : ''}
        <li><strong>截止日期：</strong>${data.dueDate}</li>
        ${data.estimatedDuration ? `<li><strong>预计时长：</strong>${data.estimatedDuration}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/learning/courses/${data.courseId || ''}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          开始学习
        </a>
      </p>
      <p>— Uplift 团队</p>
    `,
    text: (data) => `培训课程已分配\n\n${data.firstName}，您好，\n\n您有一门新的培训课程：\n\n课程：${data.courseName}\n${data.description ? `描述：${data.description}\n` : ''}截止日期：${data.dueDate}\n${data.estimatedDuration ? `预计时长：${data.estimatedDuration}\n` : ''}\n开始学习：${APP_URL}/learning/courses/${data.courseId || ''}\n\n— Uplift 团队`,
  },

  recognition_received: {
    subject: (data) => `${data.senderName} 向您发送了认可！`,
    html: (data) => `
      <h2>您获得了认可！</h2>
      <p>${data.firstName}，您好，</p>
      <p><strong>${data.senderName}</strong> 认可了您的出色工作！</p>
      ${data.badge ? `<p style="text-align: center; font-size: 48px;">${data.badge}</p>` : ''}
      ${data.message ? `<blockquote style="border-left: 4px solid #F26522; padding-left: 16px; margin: 20px 0; font-style: italic;">"${data.message}"</blockquote>` : ''}
      ${data.points ? `<p><strong>获得积分：</strong>${data.points}</p>` : ''}
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/recognition" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          查看认可
        </a>
      </p>
      <p>— Uplift 团队</p>
    `,
    text: (data) => `您获得了认可！\n\n${data.firstName}，您好，\n\n${data.senderName} 认可了您的出色工作！\n\n${data.message ? `"${data.message}"\n\n` : ''}${data.points ? `获得积分：${data.points}\n` : ''}\n查看：${APP_URL}/recognition\n\n— Uplift 团队`,
  },

  expense_decision: {
    subject: (data) => `您的报销申请已${data.approved ? '批准' : '拒绝'}`,
    html: (data) => `
      <h2>报销申请${data.approved ? '已批准' : '已拒绝'}</h2>
      <p>${data.firstName}，您好，</p>
      <p>您的报销申请已<strong>${data.approved ? '批准' : '拒绝'}</strong>。</p>
      <ul>
        <li><strong>说明：</strong>${data.description}</li>
        <li><strong>金额：</strong>${data.currency} ${data.amount}</li>
        <li><strong>提交日期：</strong>${data.submittedDate}</li>
        ${data.reviewedBy ? `<li><strong>审批人：</strong>${data.reviewedBy}</li>` : ''}
      </ul>
      ${data.notes ? `<p><strong>备注：</strong>${data.notes}</p>` : ''}
      ${data.approved ? `<p>该金额将包含在您的下一次工资中。</p>` : ''}
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/expenses" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          查看报销
        </a>
      </p>
      <p>— Uplift 团队</p>
    `,
    text: (data) => `报销申请${data.approved ? '已批准' : '已拒绝'}\n\n${data.firstName}，您好，\n\n您的报销申请已${data.approved ? '批准' : '拒绝'}。\n\n说明：${data.description}\n金额：${data.currency} ${data.amount}\n提交日期：${data.submittedDate}\n${data.reviewedBy ? `审批人：${data.reviewedBy}\n` : ''}${data.notes ? `备注：${data.notes}\n` : ''}${data.approved ? `\n该金额将包含在您的下一次工资中。\n` : ''}\n查看：${APP_URL}/expenses\n\n— Uplift 团队`,
  },

  document_signature_required: {
    subject: (data) => `文档需要您的签名：${data.documentName}`,
    html: (data) => `
      <h2>需要签名</h2>
      <p>${data.firstName}，您好，</p>
      <p>有一份文档需要您的签名：</p>
      <ul>
        <li><strong>文档：</strong>${data.documentName}</li>
        ${data.description ? `<li><strong>说明：</strong>${data.description}</li>` : ''}
        ${data.requestedBy ? `<li><strong>请求人：</strong>${data.requestedBy}</li>` : ''}
        ${data.dueDate ? `<li><strong>截止日期：</strong>${data.dueDate}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/documents/${data.documentId || ''}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          查看并签名
        </a>
      </p>
      <p>— Uplift 团队</p>
    `,
    text: (data) => `需要签名\n\n${data.firstName}，您好，\n\n有一份文档需要您的签名：\n\n文档：${data.documentName}\n${data.description ? `说明：${data.description}\n` : ''}${data.requestedBy ? `请求人：${data.requestedBy}\n` : ''}${data.dueDate ? `截止日期：${data.dueDate}\n` : ''}\n查看并签名：${APP_URL}/documents/${data.documentId || ''}\n\n— Uplift 团队`,
  },
};
