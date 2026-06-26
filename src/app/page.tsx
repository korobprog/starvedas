import { BrahmanVideo } from "@/components/brahman-video";
import { cookies } from "next/headers";
import { SignupForm } from "@/components/signup-form";
import { ScheduleContent } from "@/components/schedule-content";
import { SiteNav } from "@/components/site-nav";
import { SupportCta } from "@/components/support-cta";
import { getHomeCopy } from "@/i18n/home-copy";
import { localeCookieName } from "@/i18n/config";
import { prisma } from "@/lib/prisma";
import { steps } from "@/lib/site-data";
import { getPublicOrganizationSettings } from "@/server/organization-settings";
import { getCheckoutPaymentProvidersForCurator } from "@/server/payment-providers";
import { getCuratorForReferral, referralCookieName } from "@/server/referrals";
import { getFeaturedPublicArticles } from "@/server/articles";
import { getPublicServices } from "@/server/services";
import { applySiteBrandToCopy } from "@/lib/site-branding";
import { getRequestSiteBrand } from "@/server/site-branding";
import Image from "next/image";
import Link from "next/link";
import PayMir from "@/../public/images/pay-card-mir.svg";

export const dynamic = "force-dynamic";

async function getActiveSchedule() {
  try {
    const schedules = await prisma.schedule.findMany({
      where: { active: true },
      orderBy: { updatedAt: "desc" },
      select: {
        body: true,
        id: true,
        month: true,
        title: true
      }
    });

    return (
      schedules.find((schedule) => schedule.id !== "seed-active-schedule") ??
      schedules[0] ??
      null
    );
  } catch {
    return null;
  }
}

function formatPublishedDate(
  value: Date | string | null,
  locale?: string | null
) {
  if (!value) {
    return "";
  }

  const dateLocale =
    locale === "en" ? "en-US" : locale === "hi" ? "hi-IN" : "ru-RU";

  return new Intl.DateTimeFormat(dateLocale, {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}

async function getAssignedCurator(referralSlug?: string) {
  try {
    return await getCuratorForReferral(referralSlug);
  } catch {
    return {
      id: "administrator",
      name: "Администратор",
      postPurchaseText: null,
      postPurchaseTitle: null,
      postPurchaseUrl: null,
      showMailingConsentCheckbox: false,
      slug: "administrator",
      supportButtonLabel: "Написать вопрос администратору",
      supportEnabled: true,
      supportUrl: "https://t.me/art_om108"
    };
  }
}

export default async function Home({
  searchParams
}: {
  searchParams: Promise<{ ref?: string; service?: string }>;
}) {
  const cookieStore = await cookies();
  const params = await searchParams;
  const referralSlug =
    params.ref?.trim() ||
    cookieStore.get(referralCookieName)?.value ||
    undefined;
  const locale = cookieStore.get(localeCookieName)?.value;
  const brand = await getRequestSiteBrand();
  const copy = applySiteBrandToCopy(getHomeCopy(locale), brand.name);
  const [
    activeSchedule,
    assignedCurator,
    { contact },
    availableServices,
    featuredArticles
  ] = await Promise.all([
    getActiveSchedule(),
    getAssignedCurator(referralSlug),
    getPublicOrganizationSettings(),
    getPublicServices(locale),
    getFeaturedPublicArticles(locale)
  ]);
  const paymentProviders = await getCheckoutPaymentProvidersForCurator(
    assignedCurator.id,
    locale
  );
  const initialServiceSlug = availableServices.some(
    (service) => service.slug === params.service
  )
    ? params.service
    : undefined;
  const hideAdminSupportButtons =
    brand.sourceDomain === "chintamanidhama.ru" &&
    assignedCurator.slug === "administrator";
  const curatorSupportEnabled =
    assignedCurator.supportEnabled && !hideAdminSupportButtons;

  return (
    <main className="page-shell">
      <header className="site-header">
        <div className="container site-header__inner">
          <a className="brand" href="#top" aria-label={brand.name}>
            <span className="brand__name">{brand.name}</span>
            <span className="brand__tagline">{copy.brandTagline}</span>
          </a>
          <SiteNav locale={cookieStore.get(localeCookieName)?.value} />
        </div>
      </header>

      <section className="hero" id="top">
        <div className="container hero__grid">
          <div>
            <p className="eyebrow">{copy.hero.eyebrow}</p>
            <h1>{copy.hero.title}</h1>
            <p className="hero__lead">{copy.hero.lead}</p>
            <div className="hero__actions">
              <a className="button button--primary" href="#signup">
                {copy.hero.primaryCta}
              </a>
              <a className="button" href="#schedule">
                {copy.hero.secondaryCta}
              </a>
              <SupportCta
                className="support-cta--inline"
                supportButtonLabel={assignedCurator.supportButtonLabel}
                supportEnabled={curatorSupportEnabled}
                supportUrl={assignedCurator.supportUrl}
              />
            </div>
          </div>

          <aside className="trust-card" aria-labelledby="trust-title">
            <h2 id="trust-title">{copy.trust.title}</h2>
            <ul className="trust-list">
              {copy.trust.items.map((item) => (
                <li key={item.title}>
                  <strong>{item.title}</strong>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section className="section section--warm" id="services">
        <div className="container">
          <div className="section__header">
            <h2>{copy.sections.services.title}</h2>
            <p>{copy.sections.services.lead}</p>
          </div>
          {availableServices.length > 0 ? (
            <div className="card-grid">
              {availableServices.map((service) => (
                <a
                  className="card card--link"
                  href={`?service=${encodeURIComponent(service.slug)}#signup`}
                  key={service.title}
                >
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                  <span className="price">{service.priceLabel}</span>
                  {service.slug === "monthly-pass" && (
                    <div className="service-gift-note">
                      <strong>🎁 Подарок при покупке месяца</strong>
                      <span>
                        Разбор по ведической астрологии входит в абонемент.
                      </span>
                    </div>
                  )}
                  {service.options.length > 0 && (
                    <small>Выбрать обряды списком</small>
                  )}
                </a>
              ))}
            </div>
          ) : (
            <p className="form-note">
              Продукты пока не добавлены администратором.
            </p>
          )}
          <SupportCta
            className="support-cta--card"
            note="По тарифам можно обратиться к администратору."
            supportButtonLabel="Уточнить тарифы"
            supportEnabled={curatorSupportEnabled}
            supportUrl={assignedCurator.supportUrl}
          />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section__header">
            <h2>{copy.sections.participation.title}</h2>
            <p>{copy.sections.participation.lead}</p>
          </div>
          <div className="steps">
            {steps.map((step) => (
              <div className="step" key={step}>
                <strong>{step}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--warm">
        <div className="container brahman-section">
          <div className="brahman-section__content">
            <p className="eyebrow">{copy.sections.brahman.eyebrow}</p>
            <h2>{copy.sections.brahman.title}</h2>
            <p>{copy.sections.brahman.text}</p>
          </div>
          <BrahmanVideo />
        </div>
      </section>

      <section className="section" id="articles">
        <div className="container">
          <div className="section__header">
            <p className="eyebrow">{copy.sections.articles.eyebrow}</p>
            <h2>{copy.sections.articles.title}</h2>
            <p>{copy.sections.articles.lead}</p>
          </div>

          {featuredArticles.length > 0 ? (
            <>
              <div className="card-grid article-grid">
                {featuredArticles.map((article) => (
                  <Link
                    className="card card--link article-card"
                    href={`/articles/${article.slug}`}
                    key={article.id}
                  >
                    {article.coverImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt=""
                        className="article-card__image"
                        src={article.coverImageUrl}
                      />
                    )}
                    <div className="article-card__body">
                      {article.publishedAt && (
                        <time
                          className="article-meta"
                          dateTime={new Date(article.publishedAt).toISOString()}
                        >
                          {formatPublishedDate(article.publishedAt, locale)}
                        </time>
                      )}
                      <h3>{article.localizedTitle}</h3>
                      {article.localizedExcerpt && (
                        <p>{article.localizedExcerpt}</p>
                      )}
                      <span className="article-card__link">
                        {copy.sections.articles.read}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="form-actions">
                <Link className="button button--primary" href="/articles">
                  {copy.sections.articles.cta}
                </Link>
              </div>
            </>
          ) : (
            <div className="simple-card">
              <p>{copy.sections.articles.empty}</p>
              <Link className="button button--primary" href="/articles">
                {copy.sections.articles.cta}
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="section" id="schedule">
        <div className="container">
          <div className="schedule-box">
            <div className="section__header">
              <h2>{copy.sections.schedule.title}</h2>
              {activeSchedule ? (
                <ScheduleContent
                  body={activeSchedule.body}
                  month={activeSchedule.month}
                  title={activeSchedule.title}
                />
              ) : (
                <p>{copy.sections.schedule.empty}</p>
              )}
            </div>
            <a className="button button--primary" href="#signup">
              {copy.sections.schedule.cta}
            </a>
            <SupportCta
              note="Если нужно уточнить расписание или способ оплаты, напишите куратору."
              supportButtonLabel={assignedCurator.supportButtonLabel}
              supportEnabled={curatorSupportEnabled}
              supportUrl={assignedCurator.supportUrl}
            />
          </div>
        </div>
      </section>

      <section className="section section--warm" id="signup">
        <div className="container">
          <div className="signup-box">
            <div className="section__header">
              <h2>{copy.sections.signup.title}</h2>
              <p>{copy.sections.signup.lead}</p>
            </div>
            <SignupForm
              assignedCurator={{
                ...assignedCurator,
                supportEnabled: curatorSupportEnabled
              }}
              brandName={brand.name}
              highlightMonthlyPassBonus={
                brand.sourceDomain === "chintamanidhama.ru"
              }
              initialServiceSlug={initialServiceSlug}
              locale={locale}
              paymentProviders={paymentProviders}
              referralSlug={referralSlug ?? assignedCurator.slug}
              services={availableServices}
            />
          </div>
        </div>
      </section>

      <section className="section" id="faq">
        <div className="container">
          <div className="section__header">
            <h2>{copy.sections.faq.title}</h2>
          </div>
          <div className="faq">
            <details>
              <summary>{copy.sections.faq.paymentQuestion}</summary>
              <p>{copy.sections.faq.paymentAnswer}</p>
            </details>
            <details>
              <summary>{copy.sections.faq.participantsQuestion}</summary>
              <p>{copy.sections.faq.participantsAnswer}</p>
            </details>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container">
          <strong>{brand.name}</strong>
          <Image
            src={PayMir}
            alt="Мир"
            className="pay-logo"
            width={52}
            height={32}
          />
          <p className="site-footer__details">
            {contact.seller}, ИНН {contact.inn}. {copy.footer.detailsPrefix}{" "}
            <a href={`mailto:${contact.email}`}>{contact.email}</a>,{" "}
            <a href={`tel:${contact.phone.replaceAll(" ", "")}`}>
              {contact.phone}
            </a>
          </p>
          <div className="site-footer__links">
            <a href="/legal/privacy">{copy.footer.privacy}</a>
            <a href="/legal/personal-data-consent">
              {copy.footer.personalData}
            </a>
            <a href="/legal/offer" rel="noreferrer" target="_blank">
              {copy.footer.offer}
            </a>
            <a href="/legal/partner-agreement" rel="noreferrer" target="_blank">
              {copy.footer.partnerAgreement}
            </a>
            <a href="/payment">{copy.footer.payment}</a>
            <a href="/payment/methods">{copy.footer.methods}</a>
            <a href="/payment/security">{copy.footer.security}</a>
            <a href="/refund">{copy.footer.refund}</a>
            <a href="/contacts">{copy.footer.contacts}</a>
            <Link href="/articles">Статьи</Link>
          </div>
          <SupportCta
            className="support-cta--footer"
            supportButtonLabel={assignedCurator.supportButtonLabel}
            supportEnabled={curatorSupportEnabled}
            supportUrl={assignedCurator.supportUrl}
          />
        </div>
      </footer>
    </main>
  );
}
