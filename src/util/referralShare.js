export function referralShareMessage({ company, affiliate, link }, language = "en") {
  const spanish = language === "es";
  const percent = new Intl.NumberFormat(spanish ? "es-US" : "en-US", { maximumFractionDigits: 2 }).format(affiliate.discountPercent);
  const subject = spanish ? `Te invito a conocer ${company.name}` : `You're invited to ${company.name}`;
  const text = spanish ? [
    `Conoce ${company.name}: membresías con ahorros en servicios elegibles de bienestar y atención preventiva. Explora los beneficios de los planes y los profesionales participantes.`,
    `Usa mi código ${affiliate.code} para recibir ${percent}% de descuento en el primer pago de tu membresía de pago. Las renovaciones se cobran al precio regular del plan.`,
    `Regístrate aquí: ${link}`,
    ...(affiliate.commissionPercent > 0 ? ["Puedo recibir un bono de referido si te unes."] : []),
    `Más información: ${company.telephone} | ${company.email}`,
  ].join("\n\n") : [
    `Discover ${company.name}: memberships with savings on eligible wellness and preventive care services. Explore plan benefits and participating providers.`,
    `Use my code ${affiliate.code} for ${percent}% off your first paid membership payment. Renewals are billed at the plan's regular price.`,
    `Sign up here: ${link}`,
    ...(affiliate.commissionPercent > 0 ? ["I may earn a referral bonus if you join."] : []),
    `Learn more: ${company.telephone} | ${company.email}`,
  ].join("\n\n");
  return { subject, text, emailHref: `mailto:?subject=${encodeURIComponent(subject.replace(/[\r\n]/g, " "))}&body=${encodeURIComponent(text)}` };
}
