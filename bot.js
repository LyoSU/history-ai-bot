const Telegraf = require('telegraf')
const rateLimit = require('telegraf-ratelimit')
const Extra = require('telegraf/extra')
const fetch = require('node-fetch')

const API_LINK = 'https://models.dobro.ai/gpt2/medium/'
const FETCH_DEFAULT = {
  timeout: 10000,
  headers: {
    'User-Agent': 'telegram-bot (https://github.com/LyoSU/history-ai-bot/)<mail@lyo.su>',
    'Content-Type': 'application/json'
  },
  method: 'POST'
}

const bot = new Telegraf(process.env.BOT_TOKEN)

bot.use(async (ctx, next) => {
  const before = new Date()
  await next(ctx)
  const ms = new Date() - before

  console.log('Response time %sms', ms)
})

bot.start(async (ctx) => {
  ctx.replyWithHTML(`Привет, я дополню твою историю. Нужно лишь написать её начало из нескольких предложений. Чем четче будет сформулировано начало, тем лучше будет результат.\n\nИспользуйте команду <code>/t</code> в ответ на сообщение для продолжения истории (в группах необходимо писать <code>/t@${ctx.me}</code>).\n\nБот также умеет работать inline, для этого напиши в чате его username <code>@${ctx.me}</code>\n\n<b>GitHub бота:</b> github.com/LyoSU/history-ai-bot\n\nБот это лишь "обертка" для взаимодействия с API. Авторство принадлежит оригинальному автору проекта и все благодарности необходимо отправлять ему.\n\nGitHub проекта: github.com/mgrankin/ru_transformers\nВеб-версия проекта: text.skynet.center\n\n<b>Блог разработчика бота:</b> @LyBlog\nfeedback: @ly_oBot`)
})

const apiRequest = async (text, samples) => {
  const params = {
    prompt: text,
    length: 60,
    num_samples: samples
  }

  const response = await fetch(API_LINK, {
    ...FETCH_DEFAULT,
    body: JSON.stringify(params)
  })
  return response.json()
}

const handlerMessageGen = async (ctx) => {
  let answer
  ctx.replyWithChatAction('typing')
  if (ctx.message.text) {
    let text = ctx.message.text
    if (ctx.message.reply_to_message && ctx.message.reply_to_message.text) text = ctx.message.reply_to_message.text

    try {
      const { replies } = await apiRequest(text, 1)
      answer = `<i>${text}</i>${replies.join('')}`
    } catch (error) {
      answer = '<b>Ошибка!</b>\nНе могу сгенерировать историю, попробуй повторить попытку позже.'
    }
  } else {
    answer = 'Я понимаю только текст.'
  }

  await ctx.replyWithHTML(answer, {
    reply_to_message_id: ctx.message.message_id
  })
}

const limitConfig = {
  window: 5000,
  limit: 1,
  onLimitExceeded: (ctx, next) => ctx.reply('Пиши не так часто :(')
}

bot.on('message', rateLimit(limitConfig), handlerMessageGen)
bot.command('g', rateLimit(limitConfig), handlerMessageGen)

bot.on('inline_query', async (ctx) => {
  const { inlineQuery, answerInlineQuery } = ctx
  if (inlineQuery.query) {
    try {
      return answerInlineQuery(
        [{
          type: 'article',
          id: +(new Date()),
          title: 'Сгенерировать историю!',
          description: 'Нажми чтобы сгенерировать историю!',
          input_message_content: {
            message_text: '<i>Генерирую историю...</i>',
            parse_mode: 'HTML'
          },
          reply_markup: {
            inline_keyboard: [
              [
                { text: '⏳ Генерируется история', callback_data: 'gen' }
              ]
            ]
          }
        }],
        {
          is_personal: true,
          cache_time: 0
        }
      )
    } catch (e) {
      return answerInlineQuery(
        [
          {
            type: 'article',
            id: +new Date(),
            title: 'Ошибка',
            description: 'Не могу сгенерировать историю',
            input_message_content: {
              message_text: 'Не могу сгенерировать историю'
            }
          }
        ],
        {
          is_personal: true,
          cache_time: 0
        }
      )
    }
  }
})

bot.on('chosen_inline_result', async (ctx) => {
  const { chosenInlineResult } = ctx
  const { query, inline_message_id } = chosenInlineResult
  if (query && inline_message_id) {
    try {
      const { replies } = await apiRequest(query, 1)
      const answer = `<i>${query}</i>${replies.join('')}`

      await ctx.telegram.editMessageText(null, null, inline_message_id, answer, Extra.HTML())
    } catch (e) {
      await ctx.telegram.editMessageText(null, null, inline_message_id, 'Не могу сгенерировать историю')
    }
  }
})

bot.catch((err, ctx) => {
  console.log(`Ooops, ecountered an error for ${ctx.updateType}`, err)
})

if (process.env.BOT_DOMAIN) {
  bot.launch({
    webhook: {
      domain: process.env.BOT_DOMAIN,
      hookPath: `/HistoryBot:${process.env.BOT_TOKEN}`,
      port: process.env.WEBHOOK_PORT || 2200
    }
  }).then(() => {
    console.log('bot start webhook')
  })
} else {
  bot.launch().then(() => {
    console.log('bot start polling')
  })
}
