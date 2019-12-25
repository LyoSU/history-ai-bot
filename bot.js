const Telegraf = require('telegraf')
const Extra = require('telegraf/extra')
const fetch = require('node-fetch')

const API_LINK = 'https://models.dobro.ai/gpt2/medium/'
const FETCH_DEFAULT = {
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  method: 'POST'
}

const bot = new Telegraf(process.env.BOT_TOKEN, {
  telegram: {
    apiRoot: 'http://51.15.86.205:8012'
  }
})
bot.use(async (ctx, next) => {
  const before = new Date()
  await next(ctx)
  const ms = new Date() - before

  console.log('Response time %sms', ms)
})

bot.start(async (ctx) => {
  ctx.replyWithHTML('Привет, я дополню твою историю. Нужно лишь написать её начало из нескольких предложений. Чем четче будет сформулировано начало, тем лучше будет результат.\n\n<b>GitHub бота:</b> github.com/LyoSU/history-ai-bot\n\nБот это лишь "обертка" для взаимодействия с API. Авторство принадлежит оригинальному автору проекта и все благодарности необходимо отправлять ему.\n\nGitHub проекта: github.com/mgrankin/ru_transformers\nВеб-версия проекта: text.skynet.center\n\n<b>Блог разработчика:</b> @LyBlog')
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

bot.on('message', async (ctx) => {
  if (ctx.message.text) {
    ctx.replyWithChatAction('typing')
    const text = ctx.message.text

    try {
      const { replies } = await apiRequest(text, 1)
      const answer = `<i>${text}</i>${replies.join('')}`

      await ctx.replyWithHTML(answer, {
        reply_to_message_id: ctx.message.message_id
      })
    } catch (e) {

    }
  }
})

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
                { text: '⏳ Генерируется история', callback_data: 'upld' }
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
  const { chosenInlineResult } = ctx;
  const { query, inline_message_id } = chosenInlineResult;
  if (query && inline_message_id) {
    try {
      const { replies } = await apiRequest(query, 1)
      const answer = `<i>${query}</i>${replies.join('')}`

      await ctx.telegram.editMessageText(null, null, inline_message_id, answer, Extra.HTML())
    } catch (e) {
      await ctx.telegram.editMessageText(null, null, inline_message_id, 'Не могу сгенерировать историю');
    }
  }
  console.log('chosen inline result', chosenInlineResult);
})

bot.catch((err, ctx) => {
  console.log(`Ooops, ecountered an error for ${ctx.updateType}`, err)
})

bot.launch().then(() => {
  console.log('bot start polling')
})
