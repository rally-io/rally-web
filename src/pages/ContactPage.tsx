import { useTranslation } from 'react-i18next'

export default function ContactPage() {
  const { t } = useTranslation()

  return (
    <main className="pt-32 pb-24">
      <section className="container mx-auto px-4 max-w-6xl">
        <div className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden flex flex-col md:flex-row">
          <div className="flex-1 p-10 md:p-16">
            <h1 className="text-4xl font-bold mb-8">{t('contact.title')}</h1>
            <form className="space-y-6">
              <div>
                <input type="text" placeholder={t('contact.name')} className="w-full bg-slate-950 border border-white/10 rounded-xl px-5 py-4 focus:outline-none focus:border-electric-green transition-colors text-white placeholder:text-gray-500" />
              </div>
              <div>
                <input type="email" placeholder={t('contact.email')} className="w-full bg-slate-950 border border-white/10 rounded-xl px-5 py-4 focus:outline-none focus:border-electric-green transition-colors text-white placeholder:text-gray-500" />
              </div>
              <div>
                <textarea placeholder={t('contact.message')} rows={5} className="w-full bg-slate-950 border border-white/10 rounded-xl px-5 py-4 focus:outline-none focus:border-electric-green transition-colors text-white placeholder:text-gray-500 resize-none" />
              </div>
              <button type="button" className="w-full py-4 bg-electric-green text-slate-950 font-bold rounded-xl hover-glow transition-all text-lg">{t('contact.submit')}</button>
            </form>
          </div>
          <div className="flex-1 bg-slate-800 relative min-h-[400px]">
            <div className="absolute inset-0 p-8 flex flex-col justify-between z-10 pointer-events-none">
              <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-2xl border border-white/10 inline-block">
                <p className="text-gray-400">{t('contact.address')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}