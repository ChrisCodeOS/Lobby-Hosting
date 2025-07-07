const {REST, Routes} = require('discord.js');
require('dotenv').config();
const token = process.env.TOKEN;
const channelID = process.env.CHANNELID;
const GUILD_ID = process.env.GUILD_ID;
const CLIENT_ID = process.env.CLIENT_ID;

const commands = [
    {
        name: 'code',
        description: 'type the lobby code using /code xxxxxx <----',
        options: [
            {
                name: 'code',
                description: 'The Lobby Code',
                type: 3, // Set the type to STRING for a string input
                required: true
            },
            {
                name: 'extra_info',
                description: 'additional information',
                type: 3, // STRING type (you can change the type as needed)
                required: true // Set to false if it's optional
            }
        ],

    },
    {
        name: 'ping',
        description: 'check if the bot is online',

    },
];

const rest = new REST({version: '10'}).setToken(token);


(async () => {
    try{
        console.log('Registering slash commands...');
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            {body: commands}
        )
        console.log('slash commands were registed!');
    }catch(error){
        console.log(`There was an error: ${error}`);
    }



})();