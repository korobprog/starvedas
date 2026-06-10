import type { PaymentMethodInfo } from "@/lib/legal-content";

type PaymentMethodListProps = {
  methods: PaymentMethodInfo[];
};

export function PaymentMethodList({ methods }: PaymentMethodListProps) {
  return (
    <ul className="method-grid">
      {methods.map((method) => (
        <li className="method-card" key={method.code}>
          <span className="method-card__logo" aria-hidden="true">
            {method.logoUrl ? (
              <span
                className="method-card__logo-image"
                style={{ backgroundImage: `url(${method.logoUrl})` }}
              />
            ) : (
              <span>{method.logoText}</span>
            )}
          </span>
          <span className="method-card__name">{method.name}</span>
          <span className="method-card__description">{method.description}</span>
        </li>
      ))}
    </ul>
  );
}
