//NOTES TO DO
//Instead of turning button on and off which might not work for multiple users
//just send a message if someone tries to join and they are already in queue or not in queue and tries to leave




const {Client, IntentsBitField, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder,ComponentType} = require('discord.js');

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ]
});

//IDS so u dont leak
require('dotenv').config();
const token = process.env.TOKEN;
const channelID = process.env.CHANNELID;
const GUILD_ID = process.env.GUILD_ID;
const CLIENT_ID = process.env.CLIENT_ID;

let dmLISTID;
const runningDMChannelID = '1210336052225769492'; //This is where the channel id for the #active-dms channel
const DM_LOBBY_IDS = ['1307020256677593199', '1307020356799954954', '1307020519316389908', '1307020562802933893', '1307020598446133248', '1307021331916787783', '1307021371074940980', '1307021408877936716', '1307021447473926215', '1307021794359644293', '1307021862517211181', '1307021897334001725', '1307021928166457426', '1307021966472904785']; //This is all the different dm text channels in order.
//^^^^ looks like a mess and hard coded but needed a way to tell if the text channels were indeed correct places to hold lobbies

//code for emojis
const rank_asc = "<:ascICON:1210293029454217227>";
const rank_imm = "<:immICON:1210293131585654846>";
const rank_rad = "<:radICON:1210293210681704518>";
const rank_vct = "<:VCTICON:1210293679215091722>";
const rank_unranked = "<:unrICON:1210293268332548116>";


//test to see if bot is online
client.once('ready', async () => {
    console.log('Bot is SO ready!');

     for (const channelId of DM_LOBBY_IDS) {
        try {
            const channel = await client.channels.fetch(channelId);

            if (channel && channel.isTextBased()) {
                console.log(`Deleting messages in channel: ${channelId}`);
                await deleteMessagesInChannel(channel);
            } else {
                console.log(`Channel ${channelId} is not a valid text channel.`);
            }
        } catch (error) {
            console.error(`Failed to fetch or delete messages in channel ${channelId}:`, error);
        }
    }

    console.log('Finished deleteing messages in all channels.');




    
    
    const channel = client.channels.cache.get(runningDMChannelID);
    //channel.delete(channel.lastMessage); ch
    //console.log(channel);
    const delmMssage = await channel.messages.fetch(channel.lastMessageId);
    await delmMssage.delete();
    // Fetch the existing message

    // If the message exists, update it with new content

        const runningLobbyEmbed = new EmbedBuilder()
            .setTitle(`Running Deathmatches: ${counters.size}`)
            .setColor('#f5f525')
            .setDescription('List of currently running lobbies:');
            //.addFields(
                //{ name: 'Channel: (LOBBY NAME HERE)', value: 'Players x/10', inline: false });

        
    

   
    const sentMessage = await channel.send({ embeds: [runningLobbyEmbed], fetchReply: true });
    dmLISTID = sentMessage.id;

   
});

async function deleteMessagesInChannel(channel) {
    let messages;

    do {
        // Fetch up to 100 messages at a time
        messages = await channel.messages.fetch({ limit: 100 });

        if (messages.size > 0) {
            // Delete messages in bulk for messages newer than 14 days
            const filteredMessages = messages.filter(
                msg => Date.now() - msg.createdTimestamp < 14 * 24 * 60 * 60 * 1000
            );

            await channel.bulkDelete(filteredMessages, true).catch(err => {
                if (err.message.includes('You can only bulk delete messages that are under 14 days old')) {
                    console.log('Skipping bulk delete for older messages.');
                } else {
                    throw err;
                }
            });

            // For older messages, delete them individually
            for (const message of messages.values()) {
                if (Date.now() - message.createdTimestamp >= 14 * 24 * 60 * 60 * 1000) {
                    await message.delete().catch(console.error);
                }
            }
        }
    } while (messages.size > 0);
}


//these are variables used in the creation and tracking of dm lobbies

//player count counter
const counters = new Map();
//lobby number counter (why is it called arrayMap im cooked)
const arrayMap = new Map();
//map that stores the list of players for each lobby
const playerLists = new Map();
//channelID for list Lobbies running and the map that stores all lobbies running
const activeLobbyChannels = new Set();
//ownerID
const ownerIDS = new Set();


//listin for a slash command



client.on('interactionCreate', async (interaction) =>{
    // check to see if its a command and if the command is sent in a voice channel
    if(!interaction.isChatInputCommand()) return;
    //check if valid dm text channel
    if (interaction.commandName === 'code' && (interaction.channel.speakable || DM_LOBBY_IDS.indexOf(interaction.channel.id) === -1)) {
        return interaction.reply({ content: 'You can only use this command in a text channel! (#how-to-play)', ephemeral: true });
    }

    console.log(interaction.commandName);

    //the create lobby command
    if(interaction.commandName === 'code'){
        //Check if already lobby open in spcefic channel
        if (activeLobbyChannels.has(interaction.channelId)) {
            return interaction.reply({ content: 'There is already an active lobby in this channel.', ephemeral: true });
        }
        //check if code is correct
        const codeRegex = /^[a-zA-Z0-9]{6}$/;
        if(!codeRegex.test(interaction.options.getString('code'))){
            return interaction.reply({ content: 'This is not a valid lobby code.', ephemeral: true });
        }
        if (ownerIDS.has(interaction.user.id)) {
            return interaction.reply({ content: 'You already are a lobby host. Close old lobby to make new lobby.', ephemeral: true });
        }

        const lobbyOwnerID = interaction.user.id;
        ownerIDS.add(lobbyOwnerID);
        
        //create the join and leave button
        const firstButton = new ButtonBuilder()
            .setLabel('join')
            .setStyle(ButtonStyle.Primary)
            .setCustomId('join-dm-lobby-1')
        
        const secoundButton = new ButtonBuilder()
            .setLabel('leave')
            .setStyle(ButtonStyle.Secondary)
            .setCustomId('leave-dm-lobby-1')
        
        const thirdButton = new ButtonBuilder()
            .setLabel('close')
            .setStyle(ButtonStyle.Danger)
            .setCustomId('delete-dm-lobby-1')

        //add the buttons to a row and turn of join button for lobby creator
        //<------------------------------------------------------------------------------- testing comment this out
        const buttonRow = new ActionRowBuilder().addComponents(firstButton, secoundButton, thirdButton);
        
        //use the index of the text channel in the list of text channels to find out what level lobby it is
        //0-1: invite ----> 2-4: radiant ---> 5-8: immortal ---> 9-13: ascendent
        const rank_index = DM_LOBBY_IDS.indexOf(interaction.channelId);
        let rank_id = rank_unranked //correct emoji icon code stored here
        if(rank_index < 0){rank_id = rank_unranked;}
        else if(rank_index <2){rank_id = rank_vct;}
        else if(rank_index <5){rank_id = rank_rad;}
        else if(rank_index <9){rank_id = rank_imm;}
        else{rank_id = rank_asc;}

        const input = interaction.options.getString('code'); //Lobby Code = const Input
        const tags = interaction.options.getString('extra_info');
        const max_PLAYERS = 10;
        //currently not player list and just the user that makes the lobby
        const player_list = interaction.user.id;
        playerLists.set(interaction.id, [player_list]);
        
        //set up the maps for player count and lobby #
        counters.set(interaction.id, 1);
        arrayMap.set(interaction.id, counters.size);
        //create the embeded message
        const embed = new EmbedBuilder()
        .setTitle(`${rank_id} Deathmatch Lobby #${arrayMap.get(interaction.id)}`)
        .setColor('#f5f525')
        .addFields(
            { name: 'Lobby Code:', value: input, inline: false }, 
            { name: 'Player Count', value: `1/10`, inline: false },
            { name: 'Players:', value: `<@${player_list}>`, inline: false },
            { name: 'INFO:', value: tags, inline: false },  
            // Add more fields as needed
        );

        //send out the message here
        const reply = await interaction.reply({ embeds: [embed], components: [buttonRow], fetchReply: true });
        //ADD THE CODE HERE FOR PLAYERLIST THING
        activeLobbyChannels.add(interaction.channelId);
        const channel = client.channels.cache.get(runningDMChannelID);
        //fetch the message currently in active dms
        const fetchedMessage = await channel.messages.fetch(dmLISTID);
        if (fetchedMessage) {
            const fields = [];
            //adds all the current fields in an array of fields
            fetchedMessage.embeds[0].fields.forEach(field => {
                fields.push(field);
            });
            // adds the new fields into the array
            fields.push({ name: `Channel: ${interaction.channel}`, value: `Players ${counters.get(interaction.id)}/10`, inline: false });
            const updatedEmbed = new EmbedBuilder()
                .setTitle(`Running Deathmatches: ${counters.size}`)
                .setColor('#f5f525')
                .setDescription('List of currently running lobbies:')
                //.addFields(
                //{ name: `Channel: ${interaction.channel}`, value: `Players ${counters.get(interaction.id)}/10`, inline: false });
                .addFields(fields)
            fetchedMessage.edit({ embeds: [updatedEmbed] });
        } else {
            console.log(`Message with ID ${dmLISTID} not found.`);
        }
        
        
        //Listin for the button presses here and with collector.on
        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
        });


        //Listin for the button presses here and with collector.on
        
        //cooldown for button presses
        const cooldown = new Map();
        const cooldownTime = 3000; //3sec cooldown

        collector.on('collect', async (interaction2) => {
            console.log(interaction2.customId);
            const userID = interaction2.user.id;
            const currentTime = Date.now();


            //Deal with button spam here by adding 3s cooldown.
            if (cooldown.has(userID)) {
                const expirationTime = cooldown.get(userID);
                const timeLeft = expirationTime - currentTime;
                if(timeLeft>0){
                    await interaction2.reply({ content: `Please wait ${Math.ceil(timeLeft / 1000)} seconds before clicking again.`, ephemeral: true });
                    return;
                }else{
                    cooldown.delete(userID);
                }
            }
            //if clicked the join lobby button

            //Add check for cooldown here before you check what button was pressed<---------
            cooldown.set(userID, currentTime + cooldownTime);

           
            if(interaction2.customId === 'join-dm-lobby-1'){
                //check if lobby is full
                if(counters.get(interaction.id) >(max_PLAYERS-1)){
                    interaction2.reply({content: 'This Lobby is already full at 10/10 players', ephemeral: true});
                    return;
                }
                //get the List of players in lobby and index of player trying to join
                const playerList = playerLists.get(interaction.id);
                const index = playerList.indexOf(interaction2.user.id);
                //check if already in the lobby
                if(index != -1){
                    interaction2.reply({content: 'You are already in this Lobby', ephemeral: true});
                    return;
                }

                if (ownerIDS.has(interaction2.user.id)) {
                    return interaction2.reply({ content: 'You already are a lobby host. Close old lobby to make new lobby.', ephemeral: true });
                }

                //update player counter in lobby and playerlist
                let totalCount = counters.get(interaction.id) + 1;
                counters.set(interaction.id, totalCount);
                playerList.push(interaction2.user.id);
                playerLists.set(interaction.id, playerList);
                //add player to player list here since they are joining
                //edit the embeded message based on new join etc
                const updatedEmbed = new EmbedBuilder()
                    .setTitle(`${rank_id} Deathmatch Lobby #${arrayMap.get(interaction.id)}`)
                    .setColor('#f5f525')
                    .addFields(
                        { name: 'Lobby Code:', value: input, inline: false }, // Example field 1
                        { name: 'Player Count', value: `${totalCount}/10`, inline: false },
                        //{ name: 'Players:', value: `<@${player_list}>`, inline: false },
                        { name: 'Players:', value: playerList.map(playerId => `<@${playerId}>`).join(', '), inline: false },
            // Add more fields as needed
                );
                //change the embded message
                reply.edit({
                    embeds: [updatedEmbed],
                    components: [buttonRow]
                });
                //update the message
                interaction2.update({ embeds: [updatedEmbed], components: [buttonRow]  });
                
                //DO CHANGE TO ACTIVE DM HERE(CHANGE PLAYER COUNT ONLY)
                //fetch the entire message
                const fetchedMessage = await channel.messages.fetch(dmLISTID);
                //get only the fields

                //new Number
                const newNumber = counters.get(interaction.id);
                const updatedFields = fetchedMessage.embeds[0].fields.map(field => {
                    if (field.name === (`Channel: <#${interaction2.channelId}>`)) {
                        // Update the value of the player count field
                        return { ...field, value: `${newNumber}/10` };
                    }
                    return field;
                });
                //Create the new embed with the updated counter
                const updatedembedCount = new EmbedBuilder()
                .setTitle(`Running Deathmatches: ${counters.size}`)
                .setColor('#f5f525')
                .setDescription('List of currently running lobbies:')
                .addFields(updatedFields);

    fetchedMessage.edit({ embeds: [updatedembedCount] });

                //Now change the correct field to the new counter. change the value instead of name this time




                return;
            }
            if(interaction2.customId === 'leave-dm-lobby-1'){
                
                //get the current playerlist and index of player clicking button
                const playerList = playerLists.get(interaction.id);
                const index = playerList.indexOf(interaction2.user.id);
                
                //if is in the list remove from playLIST and update the PlayerLists map
                if (ownerIDS.has(interaction2.user.id)) {
                    return interaction2.reply({ content: 'You cannot leave this lobby. If you are lobby host close the lobby', ephemeral: true });
                }
                if (index != -1) {
                    playerList.splice(index, 1);
                    playerLists.set(interaction.id, playerList);
                }else{
                    //if player not in the list
                    interaction2.reply({content: 'You are not in this lobby.', ephemeral: true});
                    return;
                }
                //update player counter
                let totalCount = counters.get(interaction.id) - 1;
                counters.set(interaction.id, totalCount);
                
                //check to see if the lobby should be deleted if it has 0 members left
                if(counters.get(interaction.id)>0){
                    //dont delete lobby and build out new embeded message
                    const updatedEmbed = new EmbedBuilder()
                    .setTitle(`${rank_id} Deathmatch Lobby #${arrayMap.get(interaction.id)}`)
                    .setColor('#f5f525')
                    .addFields(
                        { name: 'Lobby Code:', value: input, inline: false }, // Example field 1
                        { name: 'Player Count', value: `${totalCount}/10`, inline: false },
                        { name: 'Players:', value: playerList.map(playerId => `<@${playerId}>`).join(', '), inline: false },
            // Add more fields as needed
                );
                //edit message
                reply.edit({
                    embeds: [updatedEmbed],
                    components: [buttonRow]
                });
                //send out updated message
                    interaction2.update({ embeds: [updatedEmbed], components: [buttonRow] });
                    //DO CHANGE TO ACTIVE DM HERE (PLAYER COUNT ONLY)
                    //get the active Dm embed message
                    const fetchedMessage = await channel.messages.fetch(dmLISTID);
                    //get the new number
                    const newNumber = counters.get(interaction.id);
                    //find the correct field to change and replace with new number
                    const updatedFields = fetchedMessage.embeds[0].fields.map(field => {
                        if (field.name === (`Channel: <#${interaction2.channelId}>`)) {
                            // Update the value of the player count field
                            return { ...field, value: `${newNumber}/10` };
                        }
                        return field;
                    });
                    //put the updated field back in the embed message
                    const updatedembedCount = new EmbedBuilder()
                        .setTitle(`Running Deathmatches: ${counters.size}`)
                        .setColor('#f5f525')
                        .setDescription('List of currently running lobbies:')
                        .addFields(updatedFields);

                    fetchedMessage.edit({ embeds: [updatedembedCount] });





                }else{
                    //delete lobby and send out delete lobby message
                    
                    //get the embed active dm message
                    ownerIDS.delete(lobbyOwnerID);
                    const runningMessage = await channel.messages.fetch(dmLISTID);
                    //filter out any field that is in the channel
                    
                    const updatedFields = runningMessage.embeds[0].fields.filter(field => {
                        // Identify the field corresponding to the deleted lobby by checking if its name contains the lobby chanelID
                        return !field.name.includes(`Channel: <#${interaction2.channelId}`);
                    });
                    
                    counters.delete(interaction.id);
                    playerLists.delete(interaction.id);

                    const updatedEmbed = new EmbedBuilder()
                        .setTitle(`Running Deathmatches: ${counters.size}`)
                        .setColor('#f5f525')
                        .setDescription('List of currently running lobbies:')
                        .addFields(updatedFields);

        // Edit the running Deathmatches message with the updated embed
                        await runningMessage.edit({ embeds: [updatedEmbed] });





                    interaction2.update({ content: 'lobby ended. Use /code to make a new lobby',embeds: [], components: [] });
                    activeLobbyChannels.delete(interaction.channelId);
                    setTimeout(() => {
                        interaction2.deleteReply();
                    }, 5000);
                    //DO CHANGE TO ACTIVE DM HERE(DELETE LOBBY from fields)
                }
                return;
            }
            if(interaction2.customId === 'delete-dm-lobby-1'){
                const member = interaction2.guild.members.cache.get(interaction2.user.id);
                if(interaction2.user.id == lobbyOwnerID || member.permissions.has('KickMembers')){
                    ownerIDS.delete(lobbyOwnerID);
                     //delete lobby and send out delete lobby message
                    
                    //get the embed active dm message
                    const runningMessage = await channel.messages.fetch(dmLISTID);
                    //filter out any field that is in the channel
                    
                    const updatedFields = runningMessage.embeds[0].fields.filter(field => {
                        // Identify the field corresponding to the deleted lobby by checking if its name contains the lobby chanelID
                        return !field.name.includes(`Channel: <#${interaction2.channelId}`);
                    });
                    
                    counters.delete(interaction.id);
                    playerLists.delete(interaction.id);

                    const updatedEmbed = new EmbedBuilder()
                        .setTitle(`Running Deathmatches: ${counters.size}`)
                        .setColor('#f5f525')
                        .setDescription('List of currently running lobbies:')
                        .addFields(updatedFields);

        // Edit the running Deathmatches message with the updated embed
                        await runningMessage.edit({ embeds: [updatedEmbed] });

                    interaction2.update({ content: 'lobby ended. Use /code to make a new lobby',embeds: [], components: [] });
                    activeLobbyChannels.delete(interaction.channelId);
                    setTimeout(() => {
                        interaction2.deleteReply();
                    }, 5000);
                    return;

                }else{
                    interaction2.reply({content: 'You are not the lobby host.', ephemeral: true});
                    return;
                }
            }
            
        })
    }
    //testing ping command
    if(interaction.commandName === 'ping'){
        const embed = new EmbedBuilder()
        .setTitle('ping')
        .setColor('#0099ff')
        .setDescription('The bot is online.');

        interaction.reply({ embeds: [embed] });
        setTimeout(() => {
            interaction.deleteReply();
        }, 5000);
        return;
    }
    


})

client.login(token);