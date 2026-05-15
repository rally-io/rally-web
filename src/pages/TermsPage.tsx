import { useTranslation } from 'react-i18next'

export default function TermsPage() {
  const { t } = useTranslation()

  return (
    <main className="pt-32 pb-24">
      <section className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">{t('terms.title')}</h1>
        <p className="text-gray-500 mb-12 text-center">{t('terms.updated')}</p>
        <div className="bg-slate-900 rounded-3xl p-8 md:p-12 border border-white/5 prose prose-invert max-w-none text-gray-300 leading-relaxed">
          <p>{t('terms.content')}</p>
        </div>
      </section>
    </main>
  )
}