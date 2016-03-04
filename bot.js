
if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

var Botkit = require('botkit');
var os = require('os');
var http = require('https');
var htmlparser = require("htmlparser2");
var term='';
var pagedata='';
var links='';

var conv= null;
var resp= null;

var options = {
  host: 'support.auvious.com',
  path: '/?s=register'
};
;
var parser = new htmlparser.Parser({
	onopentag: function(name, attribs){
		if(name === "a" && attribs.rel === "bookmark"){
      links+= "\n"+attribs.href;

		}
	},
	ontext: function(text){
	//something
	},
	onclosetag: function(tagname){
  //something
	}
}, {decodeEntities: true});

function get_posts(term){
  http.get(options, function(resp){
    resp.on('data', function(chunk){
      pagedata+= chunk;
    });
    resp.on("end", function (res) {

          parser.write(pagedata);
          parser.end();
          askMore(resp, conv);

      });

  }).on("error", function(e){
    console.log("ERROR:"+  e.message)
  })
}







var controller = Botkit.slackbot({
    debug: true,
});

var bot = controller.spawn({
    token: process.env.token
}).startRTM();


controller.hears(['hello','hi'],'direct_message,direct_mention,mention',function(bot, message) {

    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'robot_face',
    },function(err, res) {
        if (err) {
            bot.botkit.log('Failed to add emoji reaction :(',err);
        }
    });


    controller.storage.users.get(message.user,function(err, user) {
        if (user && user.name) {
            bot.reply(message,'Hello ' + user.name + '!!');
        } else {
            bot.reply(message,'Hello.');
        }
    });
});

controller.hears(['call me (.*)'],'direct_message,direct_mention,mention',function(bot, message) {
    var matches = message.text.match(/call me (.*)/i);
    var name = matches[1];
    controller.storage.users.get(message.user,function(err, user) {
        if (!user) {
            user = {
                id: message.user,
            };
        }
        user.name = name;
        controller.storage.users.save(user,function(err, id) {
            bot.reply(message,'Got it. I will call you ' + user.name + ' from now on.');
        });
    });
});

controller.hears(['what is my name','who am i'],'direct_message,direct_mention,mention',function(bot, message) {

    controller.storage.users.get(message.user,function(err, user) {
      if (user && user.name) {
          bot.reply(message,'Your name is ' + user.name);
      } else {
          bot.reply(message,'I don\'t know yet!');
      }
    });
});


controller.hears(['how are you', 'how are you doing', 'ca va', 'ti kaneis'],'direct_message,direct_mention,mention',function(bot, message) {

    controller.storage.users.get(message.user,function(err, user) {
      if (user && user.name) {
          bot.reply(message,'I am fine, ' + user.name + ' and you?');
      } else {
          bot.reply(message,'I am fine mate, and you?');
      }
    });
});



controller.hears(['shutdown'],'direct_message,direct_mention,mention',function(bot, message) {

    bot.startConversation(message,function(err, convo) {

        convo.ask('Are you sure you want me to shutdown?',[
            {
                pattern: bot.utterances.yes,
                callback: function(response, convo) {
                    convo.say('Bye!');
                    convo.next();
                    setTimeout(function() {
                        process.exit();
                    },3000);
                }
            },
        {
            pattern: bot.utterances.no,
            default: true,
            callback: function(response, convo) {
                convo.say('*Phew!*');
                convo.next();
            }
        }
        ]);
    });
});


controller.hears(['help', 'Can you help me', 'I need your help', 'I need some help', 'I need help', 'help me'],'direct_message,direct_mention,mention',function(bot, message) {

    bot.startConversation(message,function(err, convo) {

        convo.ask('How can i help you? Do you want me to show you the support menu?',[
            {
                pattern: bot.utterances.yes,
                callback: function(response, convo) {
                    convo.say('Here you are!');
                    convo.next();

                }
            },
        {
            pattern: bot.utterances.no,
            default: true,
            callback: function(response, convo) {
                convo.say(' So how can I help?');
                convo.next();
            }
        }
        ]);
    });
});



controller.hears(['information'],['direct_message,direct_mention,mention'],function(bot,message) {
  bot.startConversation(message, askInfo);
});

askInfo = function(response, convo) {
  convo.ask('What information do you want?', function(response, convo) {
    convo.say('Awesome.');
    conv=convo;
    resp=response;
    get_posts("s")

    convo.next();
  });
}
askMore = function(response, convo) {
  convo.ask('Do you need more information?',[
  {
    pattern: bot.utterances.yes,
    callback: function(response, convo)
    {
    askInfo(response, convo)
    convo.next();
   }
  },
  {
    pattern: bot.utterances.no,
    callback: function(response, convo) {

    convo.say('Ok! Goodbye.');
    convo.next();
  }
}])};



controller.hears(['uptime','identify yourself','who are you','what is your name'],'direct_message,direct_mention,mention',function(bot, message) {

    var hostname = os.hostname();
    var uptime = formatUptime(process.uptime());

    bot.reply(message,':robot_face: I am a bot named <@' + bot.identity.name + '>. I have been running for ' + uptime + ' on ' + hostname + '.');

});


function formatUptime(uptime) {
    var unit = 'second';
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'minute';
    }
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'hour';
    }
    if (uptime != 1) {
        unit = unit + 's';
    }

    uptime = uptime + ' ' + unit;
    return uptime;
}
