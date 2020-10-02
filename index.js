const Discord = require('discord.js-light'),
	parser = require('discord-command-parser'),
	{ MongoClient } = require('mongodb'),
	url = require('url')

let snytches;

const client = new Discord.Client({
	presence: {
		status: "online",
		activity: {
			type: 'WATCHING', 
			name: 'your messages', 
			url: 'https://pufler.dev'
		}
	},
	restTimeOffset: 100,
	partials: ["MESSAGE", "CHANNEL", "REACTION"],
	ws: {
		Intents: ["MESSAGE_CREATE", "MESSAGE_UPDATE"],
	},
	disabledEvents: [
		"GUILD_MEMBER_ADD",
		"GUILD_MEMBER_REMOVE",
		"GUILD_MEMBER_UPDATE",
		"GUILD_MEMBERS_CHUNK",
		"GUILD_INTEGRATIONS_UPDATE",
		"GUILD_ROLE_CREATE",
		"GUILD_ROLE_DELETE",
		"GUILD_ROLE_UPDATE",
		"GUILD_BAN_ADD",
		"GUILD_BAN_REMOVE",
		"GUILD_EMOJIS_UPDATE",
		"GUILD_MESSAGE_REACTIONS",
		"CHANNEL_PINS_UPDATE",
		"CHANNEL_CREATE",
		"CHANNEL_DELETE",
		"CHANNEL_UPDATE",
		"MESSAGE_DELETE",
		"MESSAGE_DELETE_BULK",
		"MESSAGE_REACTION_REMOVE",
		"MESSAGE_REACTION_REMOVE_ALL",
		"MESSAGE_REACTION_REMOVE_EMOJI",
		"USER_UPDATE",
		"USER_SETTINGS_UPDATE",
		"PRESENCE_UPDATE",
		"TYPING_START",
		"VOICE_STATE_UPDATE",
		"VOICE_SERVER_UPDATE",
		"INVITE_CREATE",
		"INVITE_DELETE",
		"WEBHOOKS_UPDATE",
	]
}),
	config = require('dotenv').config()

if (config.error) {
	console.warn('[ERROR]: cannot parse .env file')
	process.exit(-1)
}

const prefix = process.env.PREFIX || '.tag'

client.once('ready', async () => {
	snytches = (await MongoClient.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/snytch', { useNewUrlParser: true, useUnifiedTopology: true }))
		.db(url.parse(process.env.MONGO_URL || 'mongodb://localhost:27017/snytch').pathname.substr(1))
		.collection('snytches')
	console.log('[INFO]: bot is running')
})

client.on('message', async message => {
	if (message.author.bot) return;
	message.content = message.content.toLowerCase()
	const parsed = parser.parse(message, prefix, { allowSpaceBeforeCommand: true })
	try {
		if (parsed.success && parsed.command){
			switch(parsed.command) {
				case 'add':
					if(parsed.arguments.length >= 2){
						const found = await snytches.findOne({ short: parsed.arguments[0] })
						if(!found) {
							const { ops:[inserted] } = await snytches.insertOne({
								short: parsed.arguments[0],
								long: parsed.arguments[1],
								user: message.author.id
							})
							if(inserted)
								await message.channel.send(`Successfully added '${inserted.short}' to your collection. Use it by running \`.tag ${inserted.short}\`.`)
						}
					}
					break;
				case 'del':
					if(parsed.arguments.length >= 1){
						const { value:deleted } = await snytches.findOneAndDelete({ short: parsed.arguments[0] })
						if(deleted)
							await message.channel.send(`Successfully removed '${deleted.short}' from your collection.`)
					}
					break;
				case 'list':
					const snytchList = await snytches.find({ user: message.author.id }).toArray()
					if(snytchList.length > 0) await message.channel.send(snytchList.map(s => s.short).join(', '))
					break;
				default:
					const snytch = await snytches.findOne({ short: parsed.command })
					if(snytch) await message.channel.send(snytch.long)
			}
		} 
			
	}catch(err){
		console.error(`'${err.message}' on channel ${message.channel.id} in guild ${message.guild.id}`)
	}
})

client.login(process.env.TOKEN)