export function referralShareMessage({ company, affiliate, link }, language = "en") {
  const spanish = language === "es";
  const percent = new Intl.NumberFormat(spanish ? "es-US" : "en-US", { maximumFractionDigits: 2 }).format(affiliate.discountPercent);
  const subject = spanish ? `Te invito a conocer ${company.name}` : `You're invited to ${company.name}`;
  const business = affiliate.kind === "business" ? affiliate.businessName : "";
  const text = spanish ? [
    `Conoce ${company.name}: membresías con ahorros en servicios elegibles de bienestar y atención preventiva. Explora los beneficios de los planes y los profesionales participantes.`,
    `Usa ${business ? `el código de ${business}:` : "mi código"} ${affiliate.code} para recibir ${percent}% de descuento en el primer pago de tu membresía de pago. Las renovaciones se cobran al precio regular del plan.`,
    `Regístrate aquí: ${link}`,
    ...(affiliate.commissionPercent > 0 ? [business ? `${business} puede recibir un bono de referido si te unes.` : "Puedo recibir un bono de referido si te unes."] : []),
    `Más información: ${company.telephone} | ${company.email}`,
  ].join("\n\n") : [
    `Discover ${company.name}: memberships with savings on eligible wellness and preventive care services. Explore plan benefits and participating providers.`,
    `Use ${business ? `${business}'s referral code` : "my code"} ${affiliate.code} for ${percent}% off your first paid membership payment. Renewals are billed at the plan's regular price.`,
    `Sign up here: ${link}`,
    ...(affiliate.commissionPercent > 0 ? [business ? `${business} may earn a referral bonus if you join.` : "I may earn a referral bonus if you join."] : []),
    `Learn more: ${company.telephone} | ${company.email}`,
  ].join("\n\n");
  return { subject, text, emailHref: `mailto:?subject=${encodeURIComponent(subject.replace(/[\r\n]/g, " "))}&body=${encodeURIComponent(text)}` };
}

export function businessAffiliateInvitation({ company, affiliate, link }, language = "en") {
  const spanish = language === "es";
  const share = referralShareMessage({ company, affiliate, link }, language);
  const cadence = affiliate.commissionMode === "recurring" ? (spanish ? "el primer pago y cada renovación elegible" : "the first payment and each eligible renewal") : (spanish ? "solo el primer pago elegible" : "the first eligible payment only");
  const subject = spanish ? `${company.name}: invitación de afiliado para ${affiliate.businessName}` : `${company.name}: affiliate invitation for ${affiliate.businessName}`;
  const text = spanish ? `Hola ${affiliate.contactName || affiliate.businessName},\n\n${affiliate.businessName} está registrado como afiliado comercial de ${company.name}.\n\nTu código: ${affiliate.code}\nEnlace para tus clientes: ${link}\nDescuento al cliente: ${affiliate.discountPercent}% en su primer pago de membresía.\nComisión para tu negocio: ${affiliate.commissionPercent}% del importe de membresía cobrado después de descuentos y sin impuestos, en ${cadence}.\n\nComparte esta invitación con tus clientes:\n\n${share.text}` : `Hello ${affiliate.contactName || affiliate.businessName},\n\n${affiliate.businessName} is registered as a business affiliate of ${company.name}.\n\nYour code: ${affiliate.code}\nCustomer referral link: ${link}\nCustomer discount: ${affiliate.discountPercent}% off their first membership payment.\nYour business commission: ${affiliate.commissionPercent}% of the membership amount collected after discounts, excluding tax, on ${cadence}.\n\nShare this invitation with your customers:\n\n${share.text}`;
  const portalUrl = new URL("/business-affiliate/login", link).toString();
  const portalText = `${text}\n\n${spanish ? "Consulta tus registros, comisiones y pagos en tu portal comercial. Solicita un enlace de acceso con tu correo registrado:" : "View your business records, commissions and payouts in your portal. Request a sign-in link using your registered email:"}\n${portalUrl}`;
  return { subject, text: portalText, emailHref: `mailto:${encodeURIComponent(affiliate.email)}?subject=${encodeURIComponent(subject.replace(/[\r\n]/g, " "))}&body=${encodeURIComponent(portalText)}` };
}
