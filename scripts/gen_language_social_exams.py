#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""إنشاء امتحانات اللغة العربية والإنجليزية والتربية الإسلامية والدراسات الاجتماعية.
كل النماذج موسومة sample ومن إعدادنا؛ لا نسمي نماذج المواقع الخاصة رسمية.
"""
import json, os


def q(text, options, correct, explanation):
    return {'question': text, 'options': options, 'correctIndex': correct, 'explanation': explanation}


def make(title, duration, source, key, questions):
    return {'title': title, 'durationMinutes': duration, 'status': 'sample',
            'sourceNote': source, 'answerKey': key, 'questions': questions}

# ---------------------------------------------------------------------------
# اللغة الإنجليزية — على بنية نموذج TiT الخاص، لا ورقة وزارية
# ---------------------------------------------------------------------------
ENG_SOURCE = ('من إعدادنا على بنية نموذج أكاديمية TiT الخاص الذي فُحص من موقع '
              'المعلم التعليمي (نهر النيل ٢٠٢٤، ساعتان: Language، Comprehension، '
              'Composition، Supplementary). النموذج المصدر ليس ورقة وزارة.')
english = []
english.append(make('امتحان تجريبي ١ — اللغة الإنجليزية', 120, ENG_SOURCE,
    'A: 1b, 2a, 3c, 4c. B: 1d, 2c, 3a, 4b. C: 1although, 2but, 3because. '
    'D: Ibrahim El-Salahi: born 1930; studied painting and calligraphy in London; '
    'painted wooden slates at the Khalwa; Arabic calligraphy and Sudanese traditions. '
    'E: Sudan paragraph. F: Jerry was a messenger; St Evrémonde chateau; Barsad worked for the English; Dickens, companion, alive, trial, Tellson’s Bank.', [
    q('Question 1 — Choose the correct answer: (1) You are in Grade 9, ..........? (a) are you (b) aren’t you (c) were you (d) don’t you. (2) If you heat ice, it .......... (a) melts (b) melt (c) melting (d) melted. (3) Najla was .......... along the river. (a) walk (b) walked (c) walking (d) walks. (4) I have just .......... a comet. (a) see (b) saw (c) seen (d) seeing.',
      ['1b, 2a, 3c, 4c', '1a, 2b, 3a, 4d', '1d, 2c, 3b, 4a', '1c, 2d, 3d, 4b'], 0,
      'The tag is “aren’t you?”, the zero conditional takes present simple “melts”, “was” takes the -ing form, and present perfect takes the past participle “seen”.'),
    q('Question 2 — Match/complete: (1) What is your favourite subject? (2) Where do you live? (3) We use leather .......... shoes. (4) I enjoy .......... things with my hands. Answers: (a) I live in Port Sudan. (b) to make. (c) making. (d) Maths.',
      ['1d, 2a, 3b, 4c', '1a, 2d, 3c, 4b', '1b, 2c, 3d, 4a', '1c, 2b, 3a, 4d'], 0,
      'The natural matches are favourite subject–Maths, live–Port Sudan, use leather to make, and enjoy making.'),
    q('Question 3 — Choose the correct linking words: (1) .......... spiders can bite, they are not all dangerous. (2) Hana likes spiders .......... she does not like scorpions. (3) Mosquitoes are dangerous .......... they kill many people.',
      ['1 although, 2 but, 3 because', '1 because, 2 although, 3 but', '1 so, 2 because, 3 however', '1 but, 2 so, 3 although'], 0,
      'Although introduces contrast, but joins two contrasting ideas, and because gives a reason.'),
    q('Question 4 — Read and answer: “Ibrahim El-Salahi is a famous Sudanese artist. He was born in Omdurman in 1930. He studied painting and calligraphy in London and photography in New York. His work was influenced by Arabic calligraphy and Sudanese traditions. As a boy, he painted wooden slates for children at the Khalwa.” (1) Where was he born? (2) What did he study in London? (3) What influenced his art? (4) What did he paint at the Khalwa?',
      ['1 Omdurman; 2 painting and calligraphy; 3 Arabic calligraphy and Sudanese traditions; 4 wooden slates', '1 London; 2 photography; 3 European traditions; 4 books', '1 Khartoum; 2 medicine; 3 sport; 4 walls', '1 New York; 2 art only; 3 English traditions; 4 maps'], 0,
      'All four answers are stated directly in the passage.'),
    q('Question 5 — A Tale of Two Cities: choose the correct set: (1) Jerry Cruncher was a .......... (2) The Marquis lived in a .......... (3) Barsad worked for the .......... (4) Mr Lorry worked for ..........',
      ['1 messenger, 2 chateau, 3 English, 4 Tellson’s Bank', '1 lawyer, 2 prison, 3 French, 4 the Old Bailey', '1 doctor, 2 school, 3 Americans, 4 the Bastille', '1 farmer, 2 inn, 3 Republic, 4 the palace'], 0,
      'Jerry was a messenger; the Marquis lived in a chateau; Barsad secretly worked for the English; and Lorry worked for Tellson’s Bank.'),
]))

english.append(make('امتحان تجريبي ٢ — اللغة الإنجليزية', 120, ENG_SOURCE,
    'A: 1a, 2b, 3c, 4a. B: 1c, 2d, 3b, 4a. C: 1mustn’t, 2smaller, 3produced, 4were. '
    'D: passage answers: Port Sudan, three years, solar panels and wind turbines, recycling. '
    'E: correct Sudan paragraph. F: Doctor Manette was prisoner 105; Lucie daughter; Carton looked like Darnay; Defarge found letter; Carton saved Darnay.', [
    q('Question 1 — Choose: (1) The pupils .......... throw rubbish on the floor. (a) mustn’t (b) must (c) should to (d) can to. (2) When I arrived, they .......... football. (a) play (b) were playing (c) played (d) playing. (3) Oil is .......... in some countries. (a) produce (b) producing (c) produced (d) produces. (4) She has .......... her homework. (a) finished (b) finish (c) finishing (d) finishes.',
      ['1a, 2b, 3c, 4a', '1b, 2a, 3d, 4c', '1c, 2d, 3a, 4b', '1d, 2c, 3b, 4d'], 0,
      '“Mustn’t” expresses prohibition; past continuous fits “when I arrived”; passive “is produced”; and present perfect uses “finished”.'),
    q('Question 2 — Choose the correct set: (1) Meerkats are .......... than kangaroos. (a) small (b) smaller (c) smallest (d) more small. (2) Children .......... have time to play. (a) should (b) shouldn’t (c) mustn’t to (d) can’t to. (3) This donkey is very .......... (a) heavily (b) heavy (c) heaviness (d) heavier. (4) The donkey, gazelle and rabbit .......... killed. (a) was (b) is (c) were (d) be.',
      ['1b, 2a, 3b, 4c', '1a, 2b, 3a, 4d', '1c, 2d, 3c, 4a', '1d, 2c, 3d, 4b'], 0,
      'Comparatives take “smaller”; “should” gives advice; after “very” use adjective “heavy”; and the plural subject takes “were”.'),
    q('Question 3 — Read: “Port Sudan is a coastal city. Many people work near the sea. The city receives little rain, so people save water. In recent years, schools have taught pupils about recycling and clean energy. Some buildings use solar panels and small wind turbines.” Choose the correct set: (1) Port Sudan is near the .......... (2) People save .......... (3) Schools teach about .......... (4) Some buildings use ..........',
      ['1 sea, 2 water, 3 recycling and clean energy, 4 solar panels and wind turbines', '1 desert, 2 food, 3 football, 4 coal', '1 Nile, 2 electricity, 3 cooking, 4 petrol', '1 mountain, 2 books, 3 farming, 4 wood'], 0,
      'The passage gives all four details.'),
    q('Question 4 — Choose the best paragraph for a composition about Sudan: (a) Sudan is a country in Africa. It has a long history, many cultures and the River Nile. Its capital is Khartoum. The country has deserts, savannah and fertile land. Sudanese people are known for hospitality. (b) Sudan is only a city and has no rivers. (c) Sudan is in Europe and has no different cultures. (d) Sudan is a small island in the Atlantic.',
      ['a', 'b', 'c', 'd'], 0,
      'Paragraph (a) is coherent, factual at this level, and covers location, history, geography and people.'),
    q('Question 5 — A Tale of Two Cities: choose the correct set: (1) Doctor Manette was Prisoner Number .......... (2) Lucie was his .......... (3) Sydney Carton looked like .......... (4) Defarge found the doctor’s ..........',
      ['1 105, 2 daughter, 3 Charles Darnay, 4 letter', '1 205, 2 sister, 3 Mr Lorry, 4 diary', '1 15, 2 wife, 3 Barsad, 4 map', '1 501, 2 companion, 3 Stryver, 4 book'], 0,
      'The four facts are central to the story and its final conflict.'),
]))

english.append(make('امتحان تجريبي ٣ — اللغة الإنجليزية', 120, ENG_SOURCE,
    'A: 1b, 2a, 3c, 4b. B: 1c, 2a, 3d, 4b. C: 1so, 2although, 3however. '
    'D: clean city passage answers: tree planting, rubbish bins, public transport, citizens. E: coherent composition. '
    'F: Revolution opened Bastille; Darnay arrested; Madame Defarge refused Lucie; Carton used a plan; girl held his hand.', [
    q('Question 1 — Choose: (1) You .......... wear a seat belt. (a) mustn’t (b) must (c) shouldn’t to (d) would to. (2) If it rains tomorrow, we .......... at home. (a) stay (b) stayed (c) staying (d) stays. (3) They .......... dinner when the phone rang. (a) have (b) had (c) were having (d) are having. (4) Have you ever .......... Khartoum? (a) visit (b) visited (c) visiting (d) visits.',
      ['1b, 2a, 3c, 4b', '1a, 2b, 3d, 4c', '1c, 2d, 3a, 4b', '1d, 2c, 3b, 4a'], 0,
      'Use must for obligation, present simple in the if-clause and will understood in the result, past continuous for an interrupted action, and past participle after have.'),
    q('Question 2 — Match the sentence halves: (1) I was tired, (2) Although the road was long, (3) He studied hard; (a) he passed the exam. (b) I finished the work. (c) we reached the village. Choose the correct order.',
      ['1b, 2c, 3a', '1a, 2b, 3c', '1c, 2a, 3b', '1b, 2a, 3c'], 0,
      'The logical links are tired–finished, long road–reached village, studied–passed.'),
    q('Question 3 — Complete with the best linking words: “The town was crowded, .......... we used public transport. .......... the journey was slow, we arrived safely. The buses were old; .........., they were useful.”',
      ['so, although, however', 'because, but, so', 'but, so, because', 'however, because, although'], 0,
      'So gives the result, although contrasts, and however introduces a contrast after a semicolon.'),
    q('Question 4 — Read: “A clean city needs cooperation. The council can plant trees and provide rubbish bins. Schools can teach pupils not to waste water. People can use public transport and keep streets clean. When citizens work together, the city becomes healthier.” Choose the correct set: (1) Who plants trees? (2) What can schools teach? (3) What can people use? (4) What makes the city healthier?',
      ['1 the council, 2 not to waste water, 3 public transport, 4 cooperation', '1 pupils, 2 driving, 3 private planes, 4 rubbish', '1 visitors, 2 painting, 3 boats, 4 noise', '1 shops, 2 cooking, 3 factories, 4 traffic'], 0,
      'Each answer is stated in the passage.'),
    q('Question 5 — A Tale of Two Cities: choose the correct set: (1) The Bastille was opened during the .......... (2) Darnay was put in .......... (3) Madame Defarge would not help .......... (4) Carton’s plan depended partly on his resemblance to ..........',
      ['1 Revolution, 2 La Force Prison, 3 Lucie, 4 Darnay', '1 wedding, 2 Tellson’s Bank, 3 Miss Pross, 4 Lorry', '1 trial in London, 2 the chateau, 3 Gabelle, 4 Barsad', '1 voyage, 2 the Old Bailey, 3 Jerry, 4 Stryver'], 0,
      'The French Revolution opened the Bastille; Darnay was held at La Force; Madame Defarge refused Lucie; Carton resembled Darnay.'),
]))

english.append(make('امتحان تجريبي ٤ — اللغة الإنجليزية', 120, ENG_SOURCE,
    'A: 1c, 2b, 3a, 4c. B: 1b, 2d, 3a, 4c. C: 1making, 2produced, 3should, 4were. '
    'D: reading passage about a school garden. E: correct paragraph. F: Marquis killed a child; Darnay rejected aristocratic title; Lucie married Darnay; Carton loved Lucie; ending sacrifice.', [
    q('Question 1 — Choose: (1) I enjoy .......... stories. (a) read (b) to read (c) reading (d) reads. (2) The bridge was .......... in 2010. (a) build (b) built (c) building (d) builds. (3) You .......... respect other people. (a) should (b) shouldn’t to (c) can to (d) mustn’t to. (4) The children .......... happy yesterday. (a) is (b) was (c) were (d) be.',
      ['1c, 2b, 3a, 4c', '1a, 2c, 3b, 4d', '1b, 2a, 3d, 4c', '1d, 2b, 3c, 4a'], 0,
      'Enjoy takes -ing; passive past is built; should gives advice; plural children takes were.'),
    q('Question 2 — Choose the correct order: (1) the / largest / island / in / the world / Greenland / is. (2) did / start / swimming / When / you? (3) is / a habit / something / you / often / do.',
      ['1 Greenland is the largest island in the world. 2 When did you start swimming? 3 A habit is something you often do.', '1 The island Greenland largest is. 2 When you swimming start did? 3 A habit something do often.', '1 Greenland is island largest. 2 Did when swimming? 3 Habit is do.', '1 Is Greenland largest the. 2 You start when. 3 Something habit often.'], 0,
      'The first option forms grammatical sentences and questions.'),
    q('Question 3 — Complete: (1) I enjoy .......... things with my hands. (2) Oil is .......... in many countries. (3) Children .......... have the chance to play. (4) The animals .......... dangerous.',
      ['1 making, 2 produced, 3 should, 4 were', '1 make, 2 producing, 3 shouldn’t, 4 was', '1 to make, 2 produce, 3 mustn’t, 4 is', '1 made, 2 produces, 3 can to, 4 be'], 0,
      'Enjoy takes making; passive is produced; should is advice; plural animals takes were.'),
    q('Question 4 — Read: “A school garden can teach more than science. Pupils prepare the soil, plant seeds and water the plants. They learn patience because plants need time to grow. The garden can also provide vegetables for the school kitchen.” Choose the correct set: (1) What do pupils prepare? (2) Why do they learn patience? (3) What can the garden provide?',
      ['1 the soil, 2 plants need time to grow, 3 vegetables', '1 the kitchen, 2 lessons are short, 3 books', '1 the road, 2 plants are fast, 3 clothes', '1 the exam, 2 pupils are tired, 3 phones'], 0,
      'The answers follow the passage.'),
    q('Question 5 — A Tale of Two Cities: choose the correct set: (1) The Marquis killed a .......... with his coach. (2) Darnay did not want to be an .......... (3) Lucie married .......... (4) Carton finally made the great ..........',
      ['1 child, 2 aristocrat, 3 Darnay, 4 sacrifice', '1 spy, 2 doctor, 3 Lorry, 4 journey', '1 soldier, 2 banker, 3 Barsad, 4 trial', '1 horse, 2 citizen, 3 Defarge, 4 escape'], 0,
      'These are the key events of Chapters 5–14.'),
]))

english.append(make('امتحان تجريبي ٥ — اللغة الإنجليزية', 120, ENG_SOURCE,
    'A: 1a, 2c, 3b, 4a. B: 1d, 2b, 3c, 4a. C: 1because, 2but, 3although. '
    'D: reading passage about a Sudanese inventor. E: best Sudan paragraph. F: Carton and Darnay looked alike; Doctor Manette defended Darnay; Barsad was Solomon; Madame Defarge died; Carton died at the guillotine.', [
    q('Question 1 — Choose: (1) She .......... to school every day. (a) goes (b) go (c) going (d) went. (2) If you study, you .......... learn more. (a) learned (b) will (c) learning (d) would to. (3) Ahmed was .......... a book. (a) read (b) reading (c) reads (d) to read. (4) We have .......... the work. (a) finished (b) finish (c) finishing (d) finishes.',
      ['1a, 2b, 3b, 4a', '1b, 2a, 3c, 4d', '1c, 2d, 3a, 4b', '1d, 2c, 3d, 4a'], 0,
      'Third-person singular takes goes; the first conditional uses will; was takes -ing; present perfect uses finished.'),
    q('Question 2 — Match: (1) Why are you late? (2) What does your father do? (3) How often do you read? (4) Where is the library? (a) He is a farmer. (b) It is near the school. (c) Because the bus was late. (d) Twice a week.',
      ['1c, 2a, 3d, 4b', '1a, 2c, 3b, 4d', '1d, 2b, 3a, 4c', '1b, 2d, 3c, 4a'], 0,
      'Each question matches its natural answer.'),
    q('Question 3 — Choose the correct connectors: “The boy ran home .......... he saw a snake. Hana likes spiders, .......... she dislikes scorpions. .......... the task was difficult, the pupils completed it.”',
      ['because, but, although', 'although, because, so', 'so, however, because', 'but, so, although'], 0,
      'Because gives the reason, but contrasts, and although introduces a contrast.'),
    q('Question 4 — Read: “A young Sudanese inventor designed a simple device to save water. The device collects rainwater from the roof and stores it in a clean tank. Families can use the water for gardens. The inventor tested the design at school and improved it after listening to the community.” Choose the correct set: (1) What does the device collect? (2) Where is water stored? (3) What can families use it for? (4) How did the inventor improve the design?',
      ['1 rainwater, 2 a clean tank, 3 gardens, 4 by listening to the community', '1 oil, 2 a river, 3 cars, 4 by ignoring people', '1 dust, 2 a box, 3 roads, 4 by copying a book', '1 seawater, 2 a bottle, 3 factories, 4 by stopping tests'], 0,
      'All four details are given in the passage.'),
    q('Question 5 — A Tale of Two Cities: choose the correct set: (1) Carton and Darnay looked .......... (2) Doctor Manette defended Darnay at the .......... (3) Barsad was also called .......... (4) Carton died at the ..........',
      ['1 alike, 2 trial, 3 Solomon, 4 guillotine', '1 different, 2 wedding, 3 Jerry, 4 prison', '1 brothers, 2 bank, 3 Gaspard, 4 chateau', '1 old, 2 school, 3 Stryver, 4 ship'], 0,
      'The resemblance enables the escape; the doctor speaks at the trial; Barsad is Solomon; Carton goes to the guillotine.'),
]))

# ---------------------------------------------------------------------------
# اللغة العربية — على بنية ورقة اللغة العربية التي فُحصت
# ---------------------------------------------------------------------------
AR_SOURCE = ('من إعدادنا على بنية ورقة اللغة العربية في نموذج الامتحان الذي فُحص '
             'من موقع المعلم التعليمي: فهم نص، الأدب والنصوص، قواعد النحو '
             'والصرف، والتعبير. المصدر موقع خاص؛ النموذج ليس ورقة وزارة.')
arabic = []

def ar_exam(n, key, qs):
    return make(f'امتحان تجريبي {n} — اللغة العربية', 150, AR_SOURCE, key, qs)

arabic.append(ar_exam('١',
    '١) ١ب ٢أ ٣ج ٤د. ٢) ١ج ٢أ ٣ب ٤د. ٣) ١ب ٢ج ٣أ ٤د. ٤) ١ج ٢ب ٣د ٤أ. ٥) ١أ ٢ج ٣ب ٤د.', [
    q('السؤال الأول — فهم النص: اقرأ: «كان سعد بن أبي وقاص رضي الله عنه شديد العناية بالتدريب على الرماية، يرى أن قوة الأمة تحتاج إلى علم وعمل وصبر. وكان يبر أمه، ويحرص على طاعة الله ورسوله.» اختر المجموعة الصحيحة: (١) ما المجال الذي تدرب فيه سعد؟ (٢) ما الذي تحتاج إليه قوة الأمة؟ (٣) ماذا كان موقفه من أمه؟ (٤) ما القيمة التي يدل عليها النص؟',
      ['١ الرماية، ٢ العلم والعمل والصبر، ٣ يبرها، ٤ الطاعة والجد', '١ التجارة، ٢ المال فقط، ٣ يهملها، ٤ الكسل', '١ الزراعة، ٢ القوة البدنية فقط، ٣ يخالفها، ٤ الغرور', '١ الكتابة، ٢ الحظ، ٣ لا يذكر النص، ٤ الخوف'], 0,
      'أفكار النص تدور حول الرماية وقوة الأمة والبر والطاعة والجد.'),
    q('السؤال الثاني — الأدب والنصوص: في قول الشاعر: «ولا ترجُ السماحةَ من بخيلٍ ** فما في النارِ للظمآنِ ماءُ»؛ اختر الصحيح: (١) الغرض الأقرب للبيت (٢) صورة البخيل في البيت (٣) معنى السماحة (٤) نوع الأسلوب في «ولا ترجُ»',
      ['١ الحكمة، ٢ لا يُنتظر منه العطاء، ٣ الكرم، ٤ نهي', '١ الغزل، ٢ كريم، ٣ الخوف، ٤ استفهام', '١ الرثاء، ٢ شجاع، ٣ الصمت، ٤ تعجب', '١ الفخر، ٢ عالم، ٣ السفر، ٤ نداء'], 0,
      'البيت حكمة تضرب مثلاً في استحالة الكرم من البخيل، و«لا ترجُ» نهي.'),
    q('السؤال الثالث — النحو: اختر المجموعة الصحيحة لإعراب ما تحته خط: (١) «إنما المؤمنون إخوةٌ» — المؤمنون. (٢) «فأصلحوا بين أخويكم» — أخويكم. (٣) «عاد الطالبُ مسروراً» — مسروراً. (٤) «لن يهملَ المجتهدُ» — يهملَ.',
      ['١ مبتدأ مرفوع بالواو، ٢ اسم مجرور بالياء، ٣ حال منصوب، ٤ مضارع منصوب', '١ خبر منصوب، ٢ فاعل مرفوع، ٣ مفعول به، ٤ ماضٍ', '١ اسم إن منصوب، ٢ مفعول به بالألف، ٣ مبتدأ، ٤ مرفوع', '١ فاعل بالفتحة، ٢ خبر بالضمة، ٣ مضاف إليه، ٤ مجزوم'], 0,
      'المؤمنون مبتدأ مرفوع بالواو، أخويكم اسم مجرور بالياء، مسروراً حال، ويهمل مضارع منصوب بلن.'),
    q('السؤال الرابع — الصرف والبلاغة: اختر الصحيح: (١) كلمة «مساجد» ممنوعة من الصرف لأنها: (أ) صيغة منتهى الجموع (ب) علم (ج) صفة (د) فعل. (٢) «العلم نور» تشبيه: (أ) تمثيلي (ب) بليغ (ج) مرسل مفصل (د) ضمني. (٣) جمع «كاتب»: (أ) كاتبات (ب) كُتّاب (ج) مكتوب (د) كتابة. (٤) ضد «الشجاعة»: (أ) الكرم (ب) الجبن (ج) الصدق (د) القوة.',
      ['١أ، ٢ب، ٣ب، ٤ب', '١ب، ٢ج، ٣أ، ٤د', '١ج، ٢أ، ٣د، ٤ج', '١د، ٢د، ٣ج، ٤أ'], 0,
      'مساجد صيغة منتهى الجموع؛ العلم نور تشبيه بليغ؛ كاتب جمعه كُتّاب؛ وضد الشجاعة الجبن.'),
    q('السؤال الخامس — التعبير: اختر الخطة التي تصلح لفقرة عن «أهمية القراءة»: (١) مقدمة تعرف القراءة (٢) فائدتان أو ثلاث (٣) مثال أو تجربة (٤) خاتمة تحث عليها.',
      ['١ تعريف، ٢ فوائد، ٣ مثال، ٤ خاتمة', '١ خاتمة، ٢ عنوان بلا شرح، ٣ تكرار، ٤ سؤال فقط', '١ وصف مكان، ٢ أرقام بلا صلة، ٣ شعر، ٤ نهاية مفاجئة', '١ أسئلة متفرقة، ٢ حذف الفكرة، ٣ تكرار العنوان، ٤ لا خاتمة'], 0,
      'الفقرة المنظمة تحتاج مقدمة وفوائد وأمثلة وخاتمة.'),
]))

arabic.append(ar_exam('٢',
    '١) ١أ ٢ج ٣د ٤ب. ٢) ١ب ٢د ٣أ ٤ج. ٣) ١ج ٢ب ٣د ٤أ. ٤) ١أ ٢د ٣ب ٤ج. ٥) ١د ٢أ ٣ج ٤ب.', [
    q('السؤال الأول — فهم النص: «لا ينهض المجتمع بالعلم وحده، ولا بالمال وحده، بل بتعاون أفراده واحترامهم للنظام وإتقانهم العمل. فإذا تعاون الناس صارت الصعاب أيسر، وأصبح الوطن أقوى.» ما المجموعة الصحيحة؟ (١) كيف ينهض المجتمع؟ (٢) ماذا يفعل التعاون؟ (٣) ما أثر إتقان العمل؟ (٤) ما عنوان مناسب؟',
      ['١ بالتعاون والعلم والعمل، ٢ ييسر الصعاب، ٣ يقوي الوطن، ٤ التعاون أساس النهضة', '١ بالمال فقط، ٢ يزيد الخلاف، ٣ يضعف الوطن، ٤ الكسل', '١ بالعزلة، ٢ يمنع الحل، ٣ لا أثر، ٤ السفر', '١ بالحظ، ٢ يوقف العمل، ٣ يضعف المجتمع، ٤ الخصومة'], 0,
      'الفكرة المركزية التعاون والعلم والعمل، وأثرها قوة الوطن.'),
    q('السؤال الثاني — الأدب: «وإذا كانت النفوسُ كباراً ** تعبتْ في مرادِها الأجسامُ» اختر الصحيح: (١) معنى كباراً (٢) العلاقة بين الشطرين (٣) مفرد الأجسام (٤) الغرض الأقرب',
      ['١ عظيمة الهمة، ٢ نتيجة، ٣ جسم، ٤ الحث على الطموح', '١ كثيرة العمر، ٢ تضاد، ٣ جسيم، ٤ الهجاء', '١ صغيرة، ٢ ترادف، ٣ جسمان، ٤ الغزل', '١ ضعيفة، ٢ شرط، ٣ جسامة، ٤ الرثاء'], 0,
      'كبر الهمة يجعل الأجسام تتعب في تحقيق المراد، والبيت يحث على الطموح.'),
    q('السؤال الثالث — النحو: اختر المجموعة الصحيحة: (١) «ما أجملَ الصدقَ!» نوع الأسلوب. (٢) «لا تهملْ واجبك» نوع لا. (٣) «إن الطالبَ مجتهدٌ» إعراب الطالب. (٤) «مررتُ بالمعلمين» علامة الجر.',
      ['١ تعجب، ٢ ناهية، ٣ اسم إن منصوب، ٤ الياء', '١ استفهام، ٢ نافية، ٣ مبتدأ، ٤ الكسرة', '١ نداء، ٢ زائدة، ٣ فاعل، ٤ الفتحة', '١ نفي، ٢ ناهية، ٣ خبر، ٤ الألف'], 0,
      'ما أفعل تعجب، لا الناهية تجزم، الطالب اسم إن، والمعلمين جمع مذكر سالم يجر بالياء.'),
    q('السؤال الرابع — الصرف والإملاء: اختر الصحيح: (١) «استغفار» مصدر الفعل: (أ) استغفر (ب) غفر (ج) غافر (د) غُفر. (٢) الهمزة في «مساءلة» كتبت على: (أ) الألف (ب) الواو (ج) الياء (د) السطر. (٣) اسم الفاعل من «نصر»: (أ) منصور (ب) ناصر (ج) نصير (د) نصر. (٤) «هؤلاء» اسم: (أ) إشارة (ب) موصول (ج) شرط (د) استفهام.',
      ['١أ، ٢ج، ٣ب، ٤أ', '١ب، ٢أ، ٣أ، ٤د', '١ج، ٢د، ٣ج، ٤ب', '١د، ٢ب، ٣د، ٤ج'], 0,
      'استغفار مصدر استغفر، والهمزة المتطرفة/المتوسطة في مساءلة على الياء، ناصر اسم فاعل، وهؤلاء اسم إشارة.'),
    q('السؤال الخامس — التعبير: أي فقرة تصلح عن «المحافظة على البيئة»؟',
      ['المحافظة على البيئة مسؤولية الجميع؛ نزرع الأشجار، ونقلل التلوث، ونحافظ على الماء. وبذلك نحمي صحتنا وموارد وطننا.', 'البيئة شيء لا علاقة لنا به، ولا داعي لأي عمل.', 'أحب السفر لأن السماء زرقاء، ثم أذكر الرياضيات بلا رابط.', 'المحافظة مهمة. مهمة. مهمة. دون سبب أو مثال.'], 0,
      'الخيار الأول فقرة مترابطة فيها موقف وإجراءات ونتيجة.'),
]))

arabic.append(ar_exam('٣',
    '١) ١ج ٢ب ٣أ ٤د. ٢) ١د ٢ب ٣ج ٤أ. ٣) ١أ ٢ج ٣ب ٤د. ٤) ١ب ٢أ ٣د ٤ج. ٥) ١ج ٢د ٣أ ٤ب.', [
    q('السؤال الأول — فهم النص: «كان المعلم يفتح باب المدرسة قبل التلاميذ، ويعد درسه بعناية، ثم يستمع إلى أسئلتهم. لم يكن يرى التعليم وظيفة فحسب، بل رسالة لبناء الإنسان.» اختر الصحيح: (١) متى يفتح المعلم؟ (٢) كيف يعد درسه؟ (٣) ماذا يرى التعليم؟ (٤) ما الصفة البارزة؟',
      ['١ قبل التلاميذ، ٢ بعناية، ٣ رسالة، ٤ الإخلاص', '١ بعدهم، ٢ بإهمال، ٣ تجارة، ٤ الكسل', '١ ليلاً، ٢ بلا تحضير، ٣ لعبة، ٤ الغرور', '١ في العطلة، ٢ سريعاً، ٣ سفراً، ٤ الخوف'], 0,
      'النص يبرز إخلاص المعلم واستعداده ورسالة التعليم.'),
    q('السؤال الثاني — الأدب: اختر الصحيح: (١) في «العلم يرفع بيتاً لا عماد له» الصورة: (أ) استعارة/تشخيص للعلم (ب) نداء (ج) طباق (د) استفهام. (٢) معنى عماد: (أ) أساس (ب) باب (ج) سقف (د) لون. (٣) مفرد بيوت: (أ) بيت (ب) بائت (ج) أبيات (د) مبيت. (٤) الغرض: (أ) الحث على العلم (ب) الاعتذار (ج) الهجاء (د) الوصف فقط.',
      ['١أ، ٢أ، ٣أ، ٤أ', '١ب، ٢ج، ٣د، ٤ب', '١ج، ٢د، ٣ب، ٤ج', '١د، ٢ب، ٣ج، ٤د'], 0,
      'البيت يجعل العلم رافعاً للبيت مجازاً، والعماد أساس، والغرض الحث على العلم.'),
    q('السؤال الثالث — النحو: (١) «جاء هؤلاء الطلاب» إعراب هؤلاء. (٢) «لن يضيعَ الحق» علامة نصب يضيع. (٣) «الصدقُ منجاةٌ» نوع الجملة. (٤) «رأيت أخاك» علامة نصب أخاك.',
      ['١ اسم إشارة مبني، ٢ الفتحة، ٣ اسمية، ٤ الألف', '١ اسم موصول، ٢ السكون، ٣ فعلية، ٤ الياء', '١ ضمير، ٢ حذف النون، ٣ شرطية، ٤ الكسرة', '١ مبتدأ معرب، ٢ الضمة، ٣ نداء، ٤ الفتحة'], 0,
      'هؤلاء اسم إشارة، لن تنصب بالفتحة، الجملة اسمية، والأسماء الخمسة تنصب بالألف.'),
    q('السؤال الرابع — النحو والصرف: اختر الصحيح: (١) «المهندسون» مرفوع بـ: (أ) الواو (ب) الألف (ج) الياء (د) الضمة المقدرة. (٢) «مررت بمساجدَ كثيرة» مساجد ممنوع من الصرف، وعلامة جره: (أ) الفتحة (ب) الكسرة (ج) الياء (د) السكون. (٣) اسم المفعول من كتب: (أ) كاتب (ب) مكتوب (ج) كتاب (د) مكتب. (٤) جمع «مدينة»: (أ) مدائن (ب) مدني (ج) مداين فقط (د) مدينةات.',
      ['١أ، ٢أ، ٣ب، ٤أ', '١ب، ٢ج، ٣أ، ٤د', '١ج، ٢ب، ٣د، ٤ج', '١د، ٢د، ٣ج، ٤ب'], 0,
      'جمع المذكر السالم يرفع بالواو؛ الممنوع من الصرف يجر بالفتحة؛ مكتوب اسم مفعول؛ مدائن جمع مدينة.'),
    q('السؤال الخامس — التعبير: اختر العناصر الأنسب لرسالة إلى صديق تحثه على الاجتهاد: (١) تحية (٢) سبب الرسالة (٣) نصيحة وأسبابها (٤) خاتمة وتوقيع.',
      ['١، ٢، ٣، ٤', '٢، ٤ فقط', '١، ٣ دون خاتمة', 'عنوان بلا مخاطب ولا سبب'], 0,
      'الرسالة الوظيفية تحتاج تحية وموضوعاً ونصيحة وخاتمة وتوقيعاً.'),
]))

arabic.append(ar_exam('٤',
    '١) ١ب ٢د ٣أ ٤ج. ٢) ١أ ٢ج ٣د ٤ب. ٣) ١د ٢أ ٣ج ٤ب. ٤) ١ج ٢ب ٣أ ٤د. ٥) ١ب ٢د ٣ج ٤أ.', [
    q('السؤال الأول — فهم النص: «الوقت ثروة لا تعود إذا ذهبت. ومن نظم ساعات يومه استطاع أن ينجز واجباته ويجد وقتاً للراحة. أما من أهمل وقته ظل نادماً.» ما الصحيح؟ (١) ماذا يشبه الوقت؟ (٢) ماذا يفعل تنظيمه؟ (٣) ماذا يجد المهمل؟ (٤) ما الفكرة الرئيسة؟',
      ['١ ثروة، ٢ يحقق الإنجاز والراحة، ٣ الندم، ٤ قيمة الوقت', '١ ماء، ٢ يسبب الفوضى، ٣ النجاح، ٤ النوم', '١ لعبة، ٢ يمنع العمل، ٣ الراحة، ٤ السفر', '١ كتاب، ٢ لا أثر له، ٣ المال، ٤ الرياضة'], 0,
      'النص يشرح قيمة الوقت وأثر تنظيمه وإهماله.'),
    q('السؤال الثاني — الأدب والبلاغة: اختر الصحيح: (١) «العلماء مصابيح الهدى» نوع الصورة. (٢) «يا طالب العلم» نوع الأسلوب. (٣) ضد «الهدى». (٤) «العلماء» مفردها.',
      ['١ تشبيه بليغ، ٢ نداء، ٣ الضلال، ٤ عالم', '١ استفهام، ٢ نهي، ٣ النور، ٤ علم', '١ طباق، ٢ تعجب، ٣ الصدق، ٤ عليم', '١ كناية، ٢ شرط، ٣ الجهل، ٤ علوم'], 0,
      'العلماء شُبّهوا بالمصابيح، ويا للنداء، وضد الهدى الضلال، ومفرد العلماء عالم.'),
    q('السؤال الثالث — النحو: (١) «إن الصدقَ منجاةٌ» خبر إن. (٢) «لم يسافرْ أخي» علامة جزم يسافر. (٣) «عاد الجندي منتصراً» منتصراً. (٤) «لا تكذب» لا.',
      ['١ منجاة، ٢ السكون، ٣ حال، ٤ ناهية', '١ الصدق، ٢ الفتحة، ٣ مفعول به، ٤ نافية', '١ إن، ٢ حذف النون، ٣ فاعل، ٤ زائدة', '١ الجملة، ٢ الضمة، ٣ خبر، ٤ شرطية'], 0,
      'منجاة خبر إن؛ لم تجزم بالسكون؛ منتصراً حال؛ ولا ناهية.'),
    q('السؤال الرابع — الصرف: (١) مصدر «تعاون»: (أ) تعاون (ب) تعاوُن (ج) متعاون (د) عون فقط. (٢) اسم المكان من جلس: (أ) جالس (ب) مجلس (ج) جلوس (د) مجلوس. (٣) «أفضل» ممنوع من الصرف لأنه: (أ) أفعل التفضيل (ب) علم (ج) مؤنث (د) جمع. (٤) جمع «كتاب»: (أ) كتب (ب) كاتبان (ج) مكتبات (د) كتابون.',
      ['١ب، ٢ب، ٣أ، ٤أ', '١أ، ٢ج، ٣د، ٤ب', '١ج، ٢أ، ٣ب، ٤د', '١د، ٢د، ٣ج، ٤ج'], 0,
      'المصدر تعاون، ومجلس اسم مكان، وأفضل على وزن أفعل، وكتب جمع كتاب.'),
    q('السؤال الخامس — اختر التعبير السليم: (١) «إن الطالبات ..........» (أ) مجتهدات (ب) مجتهدون (ج) مجتهدة (د) مجتهدان. (٢) «لن .......... المؤمن» (أ) يكذبُ (ب) يكذبَ (ج) يكذبْ (د) كذب. (٣) «مررت بـ........» (أ) المعلمان (ب) المعلمين (ج) المعلمون (د) المعلم.',
      ['١أ، ٢ب، ٣ب', '١ب، ٢ج، ٣أ', '١ج، ٢أ، ٣د', '١د، ٢د، ٣ج'], 0,
      'خبر إن جمع مؤنث سالم، ولن تنصب، والباء تجر جمع المذكر السالم بالياء.'),
]))

arabic.append(ar_exam('٥',
    '١) ١د ٢أ ٣ب ٤ج. ٢) ١ج ٢ب ٣أ ٤د. ٣) ١ب ٢د ٣ج ٤أ. ٤) ١أ ٢ج ٣د ٤ب. ٥) ١ج ٢أ ٣ب ٤د.', [
    q('السؤال الأول — فهم النص: «الصدق خلق يرفع صاحبه بين الناس، ويجعل كلامه موضع ثقة. وقد يواجه الصادق مشقة، لكنه يربح احترام الناس وراحة الضمير.» اختر الصحيح: (١) ماذا يرفع الصدق؟ (٢) ماذا يجعل كلام الصادق؟ (٣) ماذا يربح؟ (٤) ما الخلق المقابل؟',
      ['١ صاحبه، ٢ موضع ثقة، ٣ الاحترام وراحة الضمير، ٤ الكذب', '١ المال، ٢ موضع شك، ٣ الخوف، ٤ الشجاعة', '١ الصوت، ٢ بلا قيمة، ٣ الخصومة، ٤ الكرم', '١ الجسم، ٢ سريعاً، ٣ المرض، ٤ العلم'], 0,
      'النص يبين آثار الصدق ومقابله الكذب.'),
    q('السؤال الثاني — الأدب: اختر الصحيح: (١) «وما نيل المطالب بالتمني» يدعو إلى: (أ) العمل (ب) النوم (ج) السفر فقط (د) العزلة. (٢) ضد المطالب: (أ) المرغوبات (ب) الموانع فقط (ج) الأجور (د) المنازل. (٣) «التمني» مصدر الفعل: (أ) تمنى (ب) منى فقط (ج) نام (د) أمن. (٤) نوع «ما» في البيت النافي: (أ) نافية (ب) موصولة (ج) شرطية (د) استفهامية.',
      ['١أ، ٢أ، ٣أ، ٤أ', '١ب، ٢د، ٣ج، ٤ب', '١ج، ٢ب، ٣د، ٤ج', '١د، ٢ج، ٣ب، ٤د'], 0,
      'البيت يحث على السعي والعمل؛ تمنى مصدر التمني؛ وما نافية.'),
    q('السؤال الثالث — النحو: (١) «لن يهمل المجتهد» الفعل منصوب بـ: (أ) لن (ب) لم (ج) لا (د) إن. (٢) «الطلاب ناجحون» ناجحون: (أ) خبر مرفوع بالواو (ب) فاعل بالألف (ج) مفعول بالياء (د) اسم مجرور. (٣) «يا طالباً اجتهد» نوع يا. (٤) «سافر أخوك» أخوك مرفوع بـ:',
      ['١أ، ٢أ، ٣أداة نداء، ٤الواو', '١ب، ٢ب، ٣أداة شرط، ٤الألف', '١ج، ٢ج، ٣استفهام، ٤الياء', '١د، ٢د، ٣نفي، ٤الفتحة'], 0,
      'لن ناصبة؛ ناجحون خبر بالواو؛ يا للنداء؛ وأخوك من الأسماء الخمسة يرفع بالواو.'),
    q('السؤال الرابع — الإملاء والصرف: (١) الهمزة في «مسؤول» على: (أ) الواو (ب) الألف (ج) الياء (د) السطر. (٢) اسم المفعول من حفظ: (أ) حافظ (ب) محفوظ (ج) حفظ (د) حفيظ. (٣) «مدارس» ممنوعة من الصرف لأنها: (أ) صيغة منتهى الجموع (ب) علم (ج) صفة (د) فعل. (٤) جمع «قلم»: (أ) أقلام (ب) قلمان (ج) قلمون (د) قلمات.',
      ['١أ، ٢ب، ٣أ، ٤أ', '١ب، ٢أ، ٣ب، ٤ج', '١ج، ٢د، ٣ج، ٤ب', '١د، ٢ج، ٣د، ٤د'], 0,
      'مسؤول على الواو؛ محفوظ اسم مفعول؛ مدارس صيغة منتهى الجموع؛ أقلام جمع قلم.'),
    q('السؤال الخامس — اختر خاتمة مناسبة لموضوع «العلم والعمل»:',
      ['فلنعمل بما نتعلم، فبالعلم والعمل يبنى الوطن وتتحقق النهضة.', 'وهذا كل شيء، ولا صلة للموضوع بالحياة.', 'ثم انتقلت إلى حديث عن الطقس دون رابط.', 'لا خاتمة، نكرر المقدمة فقط.'], 0,
      'الخاتمة الجيدة تلخص الفكرة وتحفز على العمل.'),
]))

# ---------------------------------------------------------------------------
# التربية الإسلامية — على بنية الورقة الوزارية الحقيقية من نهر النيل
# ---------------------------------------------------------------------------
ISL_SOURCE = ('من إعدادنا على بنية ورقة التربية الإسلامية الحقيقية التي فُحصت: '
              'ولاية نهر النيل، وزارة التربية والتعليم، لجنة الامتحانات العامة. '
              'الورقة الأصلية مسح وزاري حقيقي، لكن السنة غير مكتوبة على الورقة '
              'وتظهر ٢٠٢٤ في بيانات الملف؛ هذه النماذج ليست رسمية.')
islamic = []

def isl_exam(n, key, qs):
    return make(f'امتحان تجريبي {n} — التربية الإسلامية', 90, ISL_SOURCE, key, qs)

islamic.append(isl_exam('١',
    '١) ١ب ٢أ ٣ج ٤د. ٢) ١ج ٢ب ٣أ ٤د. ٣) ١أ ٢ج ٣ب ٤د. ٤) ١ب ٢د ٣أ ٤ج. ٥) ١ج ٢أ ٣د ٤ب.', [
        q('السؤال الأول — القرآن والتجويد: اختر الصحيح: (١) في «من يعمل» حكم النون الساكنة قبل الياء: (أ) إظهار (ب) إدغام (ج) إقلاب (د) إخفاء. (٢) في «أنبئهم» حكم النون الساكنة قبل الباء: (أ) إقلاب (ب) إظهار (ج) إدغام (د) مد. (٣) من مقاصد سورة يس: (أ) تقرير التوحيد والبعث (ب) أحكام المواريث فقط (ج) تاريخ الأندلس (د) أحكام البيع فقط. (٤) معنى «وجعلنا من بين أيديهم سداً» في سياق يس: (أ) وصف الحواجز عن الإيمان (ب) حكم الزكاة (ج) قصة الهجرة (د) صفة الحج.',
          ['١ب، ٢أ، ٣أ، ٤أ', '١أ، ٢ج، ٣ب، ٤د', '١ج، ٢ب، ٣د، ٤ج', '١د، ٢د، ٣ج، ٤ب'], 0,
          'النون قبل الياء إدغام، وقبل الباء إقلاب؛ ويس تقرر التوحيد والبعث، والآية تصور الحواجز عن رؤية الحق.'),
        q('السؤال الثاني — العقيدة والحديث: اختر الصحيح: (١) الإيمان بالبعث يعني: (أ) إنكار الآخرة (ب) الإيمان بإحياء الناس للحساب (ج) ترك العمل (د) إنكار الوحي. (٢) من ثمرات الصدق: (أ) الثقة (ب) الخيانة (ج) الظلم (د) الغدر. (٣) الأخوة الإيمانية تدعو إلى: (أ) الإصلاح بين المتخاصمين (ب) نشر النزاع (ج) الغيبة (د) القطيعة. (٤) معنى الأمانة: (أ) حفظ الحقوق وأداؤها (ب) أخذ مال الغير (ج) الكذب (د) ترك المسؤولية.',
          ['١ب، ٢أ، ٣أ، ٤أ', '١أ، ٢ب، ٣ج، ٤د', '١ج، ٢د، ٣ب، ٤ج', '١د، ٢ج، ٣د، ٤ب'], 0,
          'البعث للحساب، والصدق يولد الثقة، والأخوة إصلاح، والأمانة حفظ الحقوق.'),
        q('السؤال الثالث — الفقه: اختر الصحيح: (١) نصاب زكاة الذهب هو: (أ) خمسة دنانير (ب) عشرة دنانير (ج) عشرون ديناراً (د) مائة دينار. (٢) تجب الزكاة إذا بلغ المال النصاب وحال عليه: (أ) شهر (ب) حول قمري (ج) يوم (د) أسبوع. (٣) من مبطلات الصوم: (أ) الأكل والشرب عمداً (ب) النوم (ج) السواك (د) الاغتسال. (٤) التيمم يكون عند: (أ) فقد الماء أو العجز عن استعماله (ب) وجود الماء مع القدرة دائماً (ج) السفر فقط (د) بعد الطعام.',
          ['١ج، ٢ب، ٣أ، ٤أ', '١أ، ٢ج، ٣ب، ٤د', '١د، ٢أ، ٣ج، ٤ب', '١ب، ٢د، ٣د، ٤ج'], 0,
          'نصاب الذهب عشرون ديناراً، والحول قمري، والأكل والشرب عمداً يبطلان الصوم، والتيمم لعذر الماء.'),
        q('السؤال الرابع — السيرة: اختر الصحيح: (١) وقع صلح الحديبية بين المسلمين و: (أ) الروم (ب) قريش (ج) الفرس (د) الحبشة. (٢) من نتائج الصلح: (أ) انتشار الدعوة في جو من الأمن (ب) توقف الدعوة نهائياً (ج) ضياع المدينة (د) إلغاء الصلاة. (٣) بنو قريظة كانوا في: (أ) المدينة (ب) مكة (ج) مصر (د) اليمن. (٤) من صفات النبي ﷺ في المعاملة: (أ) الرحمة والوفاء (ب) الغدر (ج) الظلم (د) الكبر.',
          ['١ب، ٢أ، ٣أ، ٤أ', '١أ، ٢ب، ٣ج، ٤د', '١د، ٢ج، ٣ب، ٤أ', '١ج، ٢د، ٣د، ٤ب'], 0,
          'الحديبية مع قريش، وأثمر الصلح أمناً وانتشاراً للدعوة، وبنو قريظة في المدينة، والنبي رحيم وفي.'),
        q('السؤال الخامس — القيم: صل القيمة بالموقف: (١) الشورى؛ (٢) العفو؛ (٣) صلة الرحم؛ (٤) حفظ اللسان. المواقف: (أ) لا أنقل كلاماً يفسد بين الناس؛ (ب) أزور أقاربي وأحسن إليهم؛ (ج) أستشير أهل الخبرة؛ (د) أترك الانتقام مع القدرة.',
          ['١ج، ٢د، ٣ب، ٤أ', '١أ، ٢ب، ٣د، ٤ج', '١د، ٢أ، ٣ج، ٤ب', '١ب، ٢ج، ٣أ، ٤د'], 0,
          'الشورى استشارة، والعفو ترك الانتقام، وصلة الرحم للأقارب، وحفظ اللسان ترك النميمة.'),
    ]))

islamic.append(isl_exam('٢',
    '١) ١أ ٢ج ٣ب ٤د. ٢) ١ب ٢أ ٣د ٤ج. ٣) ١ج ٢أ ٣ب ٤د. ٤) ١أ ٢ب ٣ج ٤د. ٥) ١د ٢ج ٣أ ٤ب.', [
        q('السؤال الأول — القرآن والتجويد: (١) حكم النون في «من ربهم»: (أ) إدغام بغير غنة (ب) إظهار (ج) إقلاب (د) إخفاء. (٢) حكم النون في «من آمن»: (أ) إظهار حلقي (ب) إدغام (ج) إقلاب (د) مد. (٣) الإخفاء يكون قبل: (أ) حروف الحلق (ب) خمسة عشر حرفاً (ج) الباء فقط (د) الياء والراء فقط. (٤) قصة أصحاب القرية في يس تبين: (أ) عاقبة تكذيب الرسل (ب) أحكام الحج (ج) زكاة الزروع (د) تاريخ الدولة الأموية.',
          ['١أ، ٢أ، ٣ب، ٤أ', '١ب، ٢ج، ٣د، ٤ب', '١ج، ٢ب، ٣أ، ٤د', '١د، ٢د، ٣ج، ٤ج'], 0,
          'النون قبل الراء إدغام بغير غنة، وقبل الهمزة إظهار حلقي، والإخفاء قبل خمسة عشر حرفاً، وقصة القرية عاقبة التكذيب.'),
        q('السؤال الثاني — الإيمان والأخلاق: (١) التوكل الصحيح يعني: (أ) ترك الأسباب (ب) الأخذ بالأسباب مع الاعتماد على الله (ج) الكسل (د) الاعتماد على الناس فقط. (٢) ضد الأمانة: (أ) الخيانة (ب) الصدق (ج) الوفاء (د) الإحسان. (٣) الإصلاح بين الناس: (أ) خلق محمود (ب) غيبة (ج) كذب محرم دائماً حتى الإصلاح (د) قطيعة. (٤) شكر النعمة يكون بـ: (أ) نسبتها لله واستعمالها في الخير (ب) كفرها (ج) إسرافها (د) منعها عن الناس.',
          ['١ب، ٢أ، ٣أ، ٤أ', '١أ، ٢ب، ٣ج، ٤د', '١ج، ٢د، ٣ب، ٤ج', '١د، ٢ج، ٣د، ٤ب'], 0,
          'التوكل لا يلغي السبب؛ الخيانة ضد الأمانة؛ الإصلاح خلق؛ والشكر اعتراف وعمل صالح.'),
        q('السؤال الثالث — الفقه: (١) الركن الذي لا يصح الوضوء بدونه: (أ) النية (ب) الكلام (ج) النوم (د) الضحك. (٢) من مصارف الزكاة: (أ) الفقراء والمساكين (ب) الأغنياء بلا حاجة (ج) كل تاجر (د) من لا يستحق. (٣) صلاة الفجر: (أ) ركعتان (ب) ثلاث (ج) أربع (د) خمس. (٤) من سنن الوضوء: (أ) التسمية (ب) ترك الماء (ج) تعمد النجاسة (د) ترك النية.',
          ['١أ، ٢أ، ٣أ، ٤أ', '١ب، ٢ج، ٣ب، ٤د', '١ج، ٢أ، ٣د، ٤ج', '١د، ٢د، ٣ج، ٤ب'], 0,
          'النية لازمة، الفقراء والمساكين من المصارف، الفجر ركعتان، والتسمية من سنن الوضوء.'),
        q('السؤال الرابع — السيرة: (١) كان صلح الحديبية في السنة: (أ) السادسة للهجرة (ب) الأولى (ج) العاشرة (د) الثانية. (٢) سمي الصلح فتحاً مبيناً لأنه: (أ) أتاح الأمن والدعوة (ب) أوقف الإسلام (ج) أخرج المسلمين من المدينة (د) منع العمرة للأبد. (٣) من دروس السيرة: (أ) الوفاء بالعهد (ب) نقض العهد (ج) الغدر (د) التعصب. (٤) الموقف الصحيح من الأسرى: (أ) الرحمة والعدل وفق الشرع (ب) الظلم (ج) الإهانة (د) قتل الجميع.',
          ['١أ، ٢أ، ٣أ، ٤أ', '١ب، ٢د، ٣ج، ٤ب', '١ج، ٢ب، ٣د، ٤ج', '١د، ٢ج، ٣ب، ٤د'], 0,
          'الحديبية في السنة السادسة، والفتح الأمني والدعوي، والوفاء والعدل من دروس السيرة.'),
        q('السؤال الخامس — القيم: صل: (١) الصبر؛ (٢) الرفق؛ (٣) النظافة؛ (٤) الإحسان. (أ) أساعد المحتاج؛ (ب) أتحمل المشقة في الطاعة؛ (ج) ألين في التعامل؛ (د) أزيل الأذى وأحافظ على الطهارة.',
          ['١ب، ٢ج، ٣د، ٤أ', '١أ، ٢د، ٣ج، ٤ب', '١ج، ٢أ، ٣ب، ٤د', '١د، ٢ب، ٣أ، ٤ج'], 0,
          'الصبر تحمل، والرفق لين، والنظافة إزالة الأذى، والإحسان مساعدة الناس.'),
    ]))

islamic.append(isl_exam('٣',
    '١) ١ج ٢أ ٣د ٤ب. ٢) ١أ ٢ج ٣ب ٤د. ٣) ١ب ٢د ٣أ ٤ج. ٤) ١ج ٢أ ٣د ٤ب. ٥) ١أ ٢د ٣ج ٤ب.', [
        q('السؤال الأول — التلاوة: (١) الإقلاب يكون عند النون الساكنة أو التنوين قبل: (أ) الباء (ب) الميم (ج) الراء (د) الهمزة. (٢) الإدغام بغنة حروفه مجموعة في: (أ) يرملون (ب) ينمو (ج) قطب جد (د) خص ضغط قظ. (٣) الإظهار الحلقي يكون قبل: (أ) ء هـ ع ح غ خ (ب) ب فقط (ج) ي ر م ل و ن (د) ص ض ط ظ. (٤) من آيات القدرة في يس: (أ) إحياء الأرض الميتة (ب) أحكام المواريث فقط (ج) قصة بدر فقط (د) الزكاة.',
          ['١أ، ٢ب، ٣أ، ٤أ', '١ب، ٢أ، ٣ج، ٤د', '١ج، ٢د، ٣ب، ٤ج', '١د، ٢ج، ٣د، ٤ب'], 0,
          'الإقلاب قبل الباء، والإدغام بغنة في ينمو، والإظهار قبل حروف الحلق، ومن دلائل القدرة إحياء الأرض.'),
        q('السؤال الثاني — العقيدة: (١) توحيد الألوهية هو إفراد الله بـ: (أ) العبادة (ب) الخلق فقط (ج) الرزق فقط (د) العلم. (٢) الإحسان أن تعبد الله كأنك: (أ) تراه (ب) لا يراك (ج) ملك (د) لا تعمل. (٣) من آثار الإيمان باليوم الآخر: (أ) مراقبة العمل (ب) الظلم (ج) اليأس (د) ترك المسؤولية. (٤) المسلم يحفظ لسانه عن: (أ) الغيبة والنميمة (ب) النصيحة (ج) السلام (د) الذكر.',
          ['١أ، ٢أ، ٣أ، ٤أ', '١ب، ٢ج، ٣د، ٤ب', '١ج، ٢ب، ٣ج، ٤د', '١د، ٢د، ٣ب، ٤ج'], 0,
          'الألوهية عبادة، والإحسان مراقبة، والإيمان بالآخرة يراقب العمل، وحفظ اللسان من الغيبة والنميمة.'),
        q('السؤال الثالث — الفقه: (١) نصاب الذهب المذكور في المقرر: (أ) عشرون ديناراً (ب) خمسة (ج) أربعون (د) مائة. (٢) زكاة المال تطهر: (أ) المال والنفس (ب) البدن فقط (ج) الطعام فقط (د) الطريق. (٣) من شروط الصلاة: (أ) دخول الوقت (ب) ترك القبلة (ج) تعمد النجاسة (د) ترك الطهارة. (٤) الصيام هو الإمساك عن المفطرات من الفجر إلى: (أ) غروب الشمس (ب) الظهر (ج) العصر (د) منتصف الليل.',
          ['١أ، ٢أ، ٣أ، ٤أ', '١ب، ٢ج، ٣ب، ٤د', '١ج، ٢أ، ٣د، ٤ب', '١د، ٢د، ٣ج، ٤ج'], 0,
          'النصاب عشرون ديناراً؛ الزكاة تطهير؛ دخول الوقت شرط؛ والصوم إلى غروب الشمس.'),
        q('السؤال الرابع — السيرة: (١) كان الهدف الظاهر من خروج النبي إلى الحديبية: (أ) العمرة (ب) التجارة (ج) الحرب فقط (د) الهجرة. (٢) من أخلاق الصحابة: (أ) الطاعة والشورى (ب) الخيانة (ج) الظلم (د) الكذب. (٣) احترام العهد يؤدي إلى: (أ) الأمن والثقة (ب) الفوضى (ج) القطيعة (د) الحرب الدائمة. (٤) نتعلم من قصة أصحاب القرية: (أ) الثبات على الحق (ب) اتباع الباطل (ج) ترك الدعوة (د) الغرور.',
          ['١أ، ٢أ، ٣أ، ٤أ', '١ب، ٢ج، ٣د، ٤ب', '١ج، ٢د، ٣ب، ٤ج', '١د، ٢ب، ٣ج، ٤د'], 0,
          'الحديبية للعمرة، والصحابة أهل طاعة وشورى، والعهد يحقق الأمن، والقصة تعلم الثبات.'),
        q('السؤال الخامس — السلوك: اختر السلوك الصحيح: (١) عند الاختلاف: (أ) أسمع وأحاور بأدب (ب) أسب (ج) أنشر الشائعة (د) أقطع الجميع. (٢) عند النعمة: (أ) أشكر الله (ب) أتكبر (ج) أسرف (د) أحسد. (٣) مع الجار: (أ) أحسن إليه (ب) أؤذيه (ج) أتجاهله دائماً (د) أعتدي. (٤) في العمل: (أ) أتقنه (ب) أغش (ج) أهمل (د) أؤخره بلا سبب.',
          ['١أ، ٢أ، ٣أ، ٤أ', '١ب، ٢ج، ٣د، ٤ب', '١ج، ٢أ، ٣ب، ٤د', '١د، ٢د، ٣ج، ٤ج'], 0,
          'الحوار والشكر والإحسان والإتقان سلوك إسلامي صحيح.'),
    ]))

islamic.append(isl_exam('٤',
    '١) ١ب ٢ج ٣أ ٤د. ٢) ١د ٢أ ٣ج ٤ب. ٣) ١أ ٢ب ٣د ٤ج. ٤) ١ب ٢د ٣أ ٤ج. ٥) ١ج ٢أ ٣ب ٤د.', [
        q('السؤال الأول — القرآن: (١) «إنما المؤمنون إخوة فأصلحوا بين أخويكم» تدعو الآية إلى: (أ) الإصلاح (ب) القطيعة (ج) الحسد (د) الخصومة. (٢) علامة الإدغام: إدخال حرف في حرف، ومن أمثلته النون قبل: (أ) الراء (ب) الباء في الإقلاب (ج) الهمزة (د) الحاء. (٣) المقصود بالبعث: (أ) الإحياء بعد الموت (ب) النوم (ج) السفر (د) الرزق. (٤) القرآن كتاب: (أ) هداية وتشريع (ب) شعر بشري (ج) تاريخ فقط (د) قصة واحدة.',
          ['١أ، ٢أ، ٣أ، ٤أ', '١ب، ٢ج، ٣د، ٤ب', '١ج، ٢ب، ٣ج، ٤د', '١د، ٢د، ٣ب، ٤ج'], 0,
          'الآية للإصلاح؛ النون قبل الراء إدغام؛ البعث بعد الموت؛ والقرآن هداية وتشريع.'),
        q('السؤال الثاني — الحديث والأخلاق: (١) المسلم من سلم الناس من: (أ) لسانه ويده (ب) ماله فقط (ج) نومه (د) سفره. (٢) الصدق يهدي إلى: (أ) البر (ب) الكذب (ج) الخيانة (د) الغدر. (٣) الرحمة تكون مع: (أ) الإنسان والحيوان (ب) العدو فقط (ج) المال فقط (د) لا أحد. (٤) أداء العمل بإحكام يسمى: (أ) إتقاناً (ب) إسرافاً (ج) غيبة (د) رياء.',
          ['١أ، ٢أ، ٣أ، ٤أ', '١ب، ٢ج، ٣د، ٤ب', '١ج، ٢ب، ٣ج، ٤د', '١د، ٢د، ٣ب، ٤ج'], 0,
          'حديث المسلم من سلم الناس من لسانه ويده، والصدق للبر، والرحمة عامة، والعمل بإحكام إتقان.'),
        q('السؤال الثالث — الفقه: (١) من شروط وجوب الزكاة بلوغ: (أ) النصاب (ب) السفر فقط (ج) النوم (د) المرض. (٢) زكاة الذهب تخرج بعد حول إذا بلغ النصاب، والنصاب المقرر: (أ) ٢٠ ديناراً (ب) ٢ (ج) ٥ (د) ١٠٠. (٣) من أركان الصلاة: (أ) القيام للقادر (ب) الضحك (ج) الكلام العمد (د) الأكل. (٤) من الأعذار المبيحة للفطر: (أ) المرض والسفر (ب) الكسل بلا عذر (ج) اللعب (د) الشبع.',
          ['١أ، ٢أ، ٣أ، ٤أ', '١ب، ٢ج، ٣د، ٤ب', '١ج، ٢د، ٣ب، ٤ج', '١د، ٢ب، ٣ج، ٤د'], 0,
          'النصاب شرط، وهو عشرون ديناراً في المقرر، والقيام ركن للقادر، والمرض والسفر عذران.'),
        q('السؤال الرابع — السيرة: (١) موقف قريش من دعوة النبي كان في بدايته: (أ) التكذيب والأذى (ب) القبول الكامل (ج) النصرة (د) الصمت دائماً. (٢) صلح الحديبية مثال على: (أ) الحكمة والصبر (ب) الغدر (ج) الكبر (د) الفوضى. (٣) المدينة هي موطن: (أ) الهجرة وبناء المجتمع المسلم (ب) أصحاب الكهف فقط (ج) الفراعنة فقط (د) الروم فقط. (٤) الوفاء بالعهد من: (أ) الأخلاق الإسلامية (ب) الخيانة (ج) النفاق (د) الظلم.',
          ['١أ، ٢أ، ٣أ، ٤أ', '١ب، ٢ج، ٣د، ٤ب', '١ج، ٢د، ٣ب، ٤ج', '١د، ٢ب، ٣ج، ٤د'], 0,
          'التكذيب والأذى، والحكمة في الصلح، والهجرة للمدينة، والوفاء أخلاق إسلامية.'),
        q('السؤال الخامس — مواقف: اختر: (١) وجدت مالاً ليس لك: (أ) أرده لصاحبه (ب) أخفيه (ج) أنكره (د) أتباهى به. (٢) أخطأ زميلك: (أ) أنصحه بلطف (ب) أفضحه (ج) أسخر منه (د) أؤذيه. (٣) اختلف شخصان: (أ) أصلح بينهما (ب) أزيد الخلاف (ج) أنقل الكلام (د) أقطع الرحم. (٤) عند القدرة على الانتقام: (أ) أعفو إن كان العفو يصلح (ب) أظلم (ج) أعتدي (د) أكذب.',
          ['١أ، ٢أ، ٣أ، ٤أ', '١ب، ٢ج، ٣د، ٤ب', '١ج، ٢أ، ٣ب، ٤د', '١د، ٢د، ٣ج، ٤ج'], 0,
          'الأمانة والنصيحة والإصلاح والعفو قيم صحيحة.'),
    ]))

islamic.append(isl_exam('٥',
    '١) ١أ ٢ب ٣د ٤ج. ٢) ١ج ٢أ ٣ب ٤د. ٣) ١ب ٢ج ٣أ ٤د. ٤) ١أ ٢ج ٣د ٤ب. ٥) ١د ٢ب ٣ج ٤أ.', [
        q('السؤال الأول — التلاوة والتفسير: (١) الإظهار الحلقي حروفه: (أ) ء هـ ع ح غ خ (ب) ينمو (ج) قطب جد (د) ب. (٢) الإقلاب يكون بتحويل النون إلى: (أ) ميم مخفاة مع الغنة (ب) لام (ج) راء (د) همزة. (٣) سورة يس تسمى عند بعض العلماء: (أ) قلب القرآن (ب) سورة الأحكام فقط (ج) سورة المواريث (د) سورة القتال. (٤) من دلائل قدرة الله في خلق الإنسان: (أ) البعث والنشور (ب) إلغاء الحساب (ج) ترك العبادة (د) إنكار الرسل.',
          ['١أ، ٢أ، ٣أ، ٤أ', '١ب، ٢ج، ٣د، ٤ب', '١ج، ٢د، ٣ب، ٤ج', '١د، ٢ب، ٣ج، ٤د'], 0,
          'حروف الإظهار معروفة؛ الإقلاب ميم مخفاة؛ ويس توصف بقلب القرآن؛ والخلق دليل القدرة والبعث.'),
        q('السؤال الثاني — العقيدة: (١) العبادة تشمل: (أ) كل قول وعمل يحبه الله (ب) الصلاة فقط (ج) المال فقط (د) النوم. (٢) من أسماء الله الحسنى: (أ) الرحيم (ب) الظالم (ج) الخائن (د) العاجز. (٣) الدعاء يكون: (أ) لله وحده (ب) للأصنام (ج) لكل مخلوق كعبادة (د) لا حاجة إليه. (٤) حسن الظن بالله معناه: (أ) الرجاء مع العمل (ب) ترك العمل (ج) الأمن من العقوبة بلا توبة (د) الكسل.',
          ['١أ، ٢أ، ٣أ، ٤أ', '١ب، ٢ج، ٣د، ٤ب', '١ج، ٢ب، ٣ج، ٤د', '١د، ٢د، ٣ب، ٤ج'], 0,
          'العبادة شاملة، والرحيم من أسمائه، والدعاء لله، وحسن الظن لا يلغي العمل.'),
        q('السؤال الثالث — الفقه: (١) زكاة الذهب في المقرر تجب عند: (أ) بلوغ ٢٠ ديناراً مع الحول (ب) أي مقدار بلا شرط (ج) ٥ دنانير (د) ١٠٠٠ دينار فقط. (٢) الوضوء يرفع: (أ) الحدث الأصغر (ب) الدين (ج) المرض كله (د) الجوع. (٣) الغسل يجب في: (أ) الجنابة (ب) النوم فقط (ج) المشي (د) القراءة. (٤) من آداب الصيام: (أ) حفظ اللسان (ب) الغيبة (ج) الكذب (د) الخصام.',
          ['١أ، ٢أ، ٣أ، ٤أ', '١ب، ٢ج، ٣د، ٤ب', '١ج، ٢د، ٣ب، ٤ج', '١د، ٢ب، ٣ج، ٤د'], 0,
          'النصاب عشرون ديناراً مع الحول؛ الوضوء للحدث الأصغر؛ الغسل للجنابة؛ والصيام تهذيب للسان.'),
        q('السؤال الرابع — السيرة: (١) من أسباب نجاح الدعوة: (أ) الصبر والحكمة (ب) العجلة (ج) نقض العهد (د) الكذب. (٢) صلح الحديبية نتج عنه: (أ) هدنة وأمن (ب) نهاية الإسلام (ج) سقوط المدينة (د) ترك القرآن. (٣) احترام الجار: (أ) خلق إسلامي (ب) أمر مكروه (ج) لا قيمة له (د) خيانة. (٤) من دروس قصة أصحاب القرية: (أ) نصرة الحق (ب) عبادة غير الله (ج) ترك النصيحة (د) اتباع الهوى.',
          ['١أ، ٢أ، ٣أ، ٤أ', '١ب، ٢ج، ٣د، ٤ب', '١ج، ٢د، ٣ب، ٤ج', '١د، ٢ب، ٣ج، ٤د'], 0,
          'الصبر والحكمة والهدنة واحترام الجار ونصرة الحق معانٍ صحيحة.'),
        q('السؤال الخامس — القيم: صل: (١) الأمانة؛ (٢) العدل؛ (٣) التواضع؛ (٤) صلة الرحم. (أ) لا أتكبر على الناس؛ (ب) أعطي كل ذي حق حقه؛ (ج) أحفظ الوديعة؛ (د) أزور الأقارب وأحسن إليهم.',
          ['١ج، ٢ب، ٣أ، ٤د', '١أ، ٢د، ٣ج، ٤ب', '١د، ٢أ، ٣ب، ٤ج', '١ب، ٢ج، ٣د، ٤أ'], 0,
          'الأمانة حفظ الوديعة، والعدل الحقوق، والتواضع ترك الكبر، وصلة الرحم للأقارب.'),
    ]))

# ---------------------------------------------------------------------------
# الدراسات الاجتماعية — التاريخ والجغرافيا في الورقتين المرسلتين
# ---------------------------------------------------------------------------
SOC_SOURCE = ('من إعدادنا على ورقتي التاريخ والجغرافيا اللتين فُحصتا من موقع '
              'المعلم التعليمي. حُفظتا تحت مادة «الدراسات الاجتماعية» في المنصة؛ '
              'النماذج تجمع المحورين لأن المنصة لديها مادة واحدة لهما. المصادر '
              'تضم ورقات نهر النيل الوزارية وصيغاً تجريبية، ولا نسمي نموذجنا رسمياً.')
social = []

def soc_exam(n, key, qs):
    return make(f'امتحان تجريبي {n} — الدراسات الاجتماعية (تاريخ وجغرافيا)', 90, SOC_SOURCE, key, qs)

social.append(soc_exam('١',
    '١) ١صح ٢خطأ ٣صح ٤صح ٥خطأ. ٢) ١ب ٢ج ٣أ ٤د. ٣) ١خطأ ٢صح ٣صح ٤خطأ. ٤) ١ب ٢أ ٣ج ٤د. ٥) الثورة المهدية، النيل الأبيض، السافنا الفقيرة، تسع دول.', [
        q('السؤال الأول — التاريخ: صح أم خطأ: (١) انتقلت الدولة المهدية بعد تحرير الخرطوم إلى مرحلة بناء الدولة. (٢) قاد اللورد كتشنر الثورة المهدية. (٣) ركز الاستعمار الاستيطاني على استغلال الموارد. (٤) يرجع أصل العثمانيين إلى قبائل تركية. (٥) كانت ثورة أكتوبر ضد نظام مايو.',
          ['١ صح، ٢ خطأ، ٣ صح، ٤ صح، ٥ خطأ', '١ خطأ، ٢ صح، ٣ خطأ، ٤ صح، ٥ صح', 'كلها صح', 'كلها خطأ'], 0,
          'بعد التحرير بدأت الدولة؛ كتشنر قائد بريطاني لا مهدي؛ الاستعمار يستغل الموارد؛ العثمانيون أتراك؛ وثورة أكتوبر ١٩٦٤ ضد عبود.'),
        q('السؤال الثاني — التاريخ: اختر: (١) حرر الإمام المهدي الخرطوم عام: (أ) ١٨٨١م (ب) ١٨٨٥م (ج) ١٩٠٥م (د) ١٩٥٦م. (٢) المدرسة الحديثة التي افتتحت في السودان عام ١٩٠٥م: (أ) كلية غردون (ب) مدرسة كتشنر الطبية (ج) جامعة الخرطوم (د) مدرسة أم درمان الصناعية. (٣) المذهب الرسمي للقضاء العثماني: (أ) الحنفي (ب) المالكي (ج) الشافعي (د) الحنبلي. (٤) وضع دولة ضعيفة تحت إشراف دولة استعمارية يسمى: (أ) الحماية (ب) الاستقلال (ج) الوحدة (د) الحياد.',
          ['١ب، ٢ب، ٣أ، ٤أ', '١أ، ٢ج، ٣ب، ٤د', '١ج، ٢أ، ٣د، ٤ب', '١د، ٢د، ٣ج، ٤ج'], 0,
          'تحرير الخرطوم ١٨٨٥؛ مدرسة كتشنر الطبية ١٩٠٥؛ الحنفي؛ والحماية.'),
        q('السؤال الثالث — الجغرافيا: صح أم خطأ: (١) يقع السودان في الجزء الشمالي الشرقي من إفريقيا. (٢) يقع السودان خارج المنطقة المدارية. (٣) ينبع النيل الأبيض من بحيرة فكتوريا. (٤) دلتا النيل تربة بركانية. (٥) تتدرج الغابات تبعاً لكمية المطر.',
          ['١ صح، ٢ خطأ، ٣ صح، ٤ خطأ، ٥ صح', '١ خطأ، ٢ صح، ٣ خطأ، ٤ صح، ٥ خطأ', 'كلها صح', 'كلها خطأ'], 0,
          'السودان شمال شرقي إفريقيا وداخل المدارية؛ الأبيض من فكتوريا؛ دلتا النيل رسوبية؛ والغابات تتدرج مع المطر.'),
        q('السؤال الرابع — الجغرافيا: اختر: (١) عاصمة ولاية سنار: (أ) سنجة (ب) سنار (ج) الدندر (د) كوستي. (٢) من أهم أشجار السافنا الفقيرة: (أ) الهشاب (ب) النخيل فقط (ج) التفاح (د) الصنوبر. (٣) مشروع الرهد يقع في ولاية: (أ) القضارف (ب) الجزيرة (ج) نهر النيل (د) البحر الأحمر. (٤) يجاور السودان: (أ) خمس دول (ب) سبع دول (ج) تسع دول (د) عشر دول.',
          ['١ب، ٢أ، ٣أ، ٤ج', '١أ، ٢ب، ٣ج، ٤د', '١ج، ٢د، ٣ب، ٤أ', '١د، ٢ج، ٣د، ٤ب'], 0,
          'سنجة عاصمة ولاية سنار، والهشاب في السافنا الفقيرة، والرهد في القضارف، والسودان يجاور تسع دول.'),
        q('السؤال الخامس — أكمل: (١) الثورة التي أقام بها المهدي دولة سودانية وطنية هي ..........؛ (٢) النهر الذي يلتقي بالأبيض في الخرطوم هو ..........؛ (٣) الإقليم النباتي ذو الأمطار القليلة يسمى ..........؛ (٤) عدد دول جوار السودان ..........',
          ['الثورة المهدية، النيل الأزرق، السافنا الفقيرة، تسع دول', 'ثورة أكتوبر، نهر عطبرة، السافنا الغنية، سبع دول', 'الثورة الفرنسية، النيل الأبيض، الصحراء، خمس دول', 'ثورة ١٩٢٤، نهر القاش، الغابات، عشر دول'], 0,
          'هذه الحقائق تجمع محور التاريخ والجغرافيا في الورقة.'),
    ]))

social.append(soc_exam('٢',
    '١) ١صح ٢خطأ ٣صح ٤خطأ ٥صح. ٢) ١ج ٢أ ٣د ٤ب. ٣) ١صح ٢صح ٣خطأ ٤صح. ٤) ١أ ٢ج ٣ب ٤د. ٥) ١٨٨٥، ثورة أكتوبر، المنطقة المدارية، مشروع الجزيرة.', [
        q('السؤال الأول — التاريخ: صح أم خطأ: (١) قاد الإمام المهدي الثورة المهدية. (٢) بدأت الدولة المهدية بتحرير الأبيض فقط. (٣) من أسباب الثورة المهدية إقامة سلطة وطنية. (٤) جمعية اللواء الأبيض قادها جعفر نميري. (٥) حدثت ثورة أكتوبر سنة ١٩٦٤م.',
          ['١ صح، ٢ خطأ، ٣ صح، ٤ خطأ، ٥ صح', '١ خطأ، ٢ صح، ٣ خطأ، ٤ صح، ٥ خطأ', 'كلها صح', 'كلها خطأ'], 0,
          'المهدي قاد الثورة؛ مرحلة الدولة بدأت بتحرير الخرطوم؛ السلطة الوطنية سبب؛ اللواء الأبيض قاده علي عبد اللطيف وعبد الفضيل الماظ؛ أكتوبر ١٩٦٤.'),
        q('السؤال الثاني — التاريخ: اختر: (١) قائد حملة إنقاذ غردون: (أ) اللورد ولزلي (ب) كتشنر (ج) نابليون (د) كرومر. (٢) أول انتخابات وطنية في السودان كانت عام: (أ) ١٩٥٣م (ب) ١٨٨٥م (ج) ١٩٦٤م (د) ١٩٢٤م. (٣) السلطان الذي أسس الجيش النظامي العثماني كان: (أ) أورخان بن عثمان (ب) سليم الأول (ج) محمد الفاتح (د) سليمان القانوني. (٤) مؤتمر الخريجين ارتبط بالحركة: (أ) الوطنية السودانية (ب) الصليبية (ج) العثمانية (د) الصناعية.',
          ['١أ، ٢أ، ٣أ، ٤أ', '١ب، ٢ج، ٣د، ٤ب', '١ج، ٢ب، ٣أ، ٤د', '١د، ٢د، ٣ج، ٤ج'], 0,
          'ولزلي قاد الحملة، والانتخابات ١٩٥٣، وأورخان أسس الجيش النظامي، ومؤتمر الخريجين وطني.'),
        q('السؤال الثالث — الجغرافيا: صح أم خطأ: (١) مشروع الجزيرة يروى بالري الانسيابي من خزان سنار. (٢) تقع مدينة عطبرة في ولاية نهر النيل. (٣) ينبع النيل الأزرق من مصر. (٤) تزداد الأمطار عموماً كلما اتجهنا جنوباً في السودان.',
          ['١ صح، ٢ صح، ٣ خطأ، ٤ صح', '١ خطأ، ٢ صح، ٣ صح، ٤ خطأ', 'كلها صح', '١ صح، ٢ خطأ، ٣ خطأ، ٤ صح'], 0,
          'الجزيرة من سنار بالري الانسيابي؛ عطبرة في نهر النيل؛ الأزرق من إثيوبيا؛ والأمطار أكثر جنوباً.'),
        q('السؤال الرابع — الجغرافيا: اختر: (١) أول حقل صدر منه بترول السودان: (أ) أبو جابرة (ب) بشائر (ج) الجيلي (د) عسلاية. (٢) مدينة جياد الصناعية في ولاية: (أ) الجزيرة (ب) الخرطوم (ج) النيل الأبيض (د) سنار. (٣) من العوامل الطبيعية لتوزيع السكان: (أ) المناخ (ب) الحروب (ج) السياسة (د) الهجرة فقط. (٤) أهم فائدة بيئية للغابات: (أ) تلطيف الجو وحماية التربة (ب) زيادة التصحر (ج) منع المطر (د) إزالة التنوع.',
          ['١أ، ٢ج، ٣أ، ٤أ', '١ب، ٢أ، ٣ب، ٤د', '١ج، ٢د، ٣ج، ٤ب', '١د، ٢ب، ٣د، ٤ج'], 0,
          'أبو جابرة حقل بترول؛ جياد في النيل الأبيض؛ المناخ عامل طبيعي؛ والغابات تلطف الجو وتحمي التربة.'),
        q('السؤال الخامس — أكمل: (١) تحرير الخرطوم كان سنة ..........؛ (٢) اندلعت ثورة أكتوبر ضد نظام ..........؛ (٣) يقع السودان داخل المنطقة ..........؛ (٤) من أكبر المشاريع المروية مشروع ..........',
          ['١٨٨٥م، عبود، المدارية، الجزيرة', '١٨٨١م، مايو، القطبية، الرهد', '١٩٥٦م، الحكم الثنائي، المعتدلة، السوكي', '١٩٢٤م، المهدية، الصحراوية، جياد'], 0,
          'تحرير الخرطوم ١٨٨٥، أكتوبر ضد عبود، السودان مداري، والجزيرة أكبر مشروع مروي.'),
    ]))

social.append(soc_exam('٣',
    '١) ١خطأ ٢صح ٣صح ٤صح ٥خطأ. ٢) ١ب ٢د ٣أ ٤ج. ٣) ١صح ٢خطأ ٣صح ٤صح. ٤) ١ج ٢أ ٣د ٤ب. ٥) ١-الحاكم العام ٢-الزراعة ٣-النيل الأزرق ٤-الهشاب.', [
        q('السؤال الأول — التاريخ: صح أم خطأ: (١) الاستعمار السياسي يعني استقلال الدولة الضعيفة. (٢) الحماية نوع من أنواع الاستعمار السياسي. (٣) من دوافع الاستعمار البحث عن أسواق للمنتجات. (٤) قامت حركات التحرر الوطني في إفريقيا في القرنين التاسع عشر والعشرين. (٥) فتح القسطنطينية أضعف الدولة العثمانية فوراً.',
          ['١ خطأ، ٢ صح، ٣ صح، ٤ صح، ٥ خطأ', '١ صح، ٢ خطأ، ٣ خطأ، ٤ صح، ٥ صح', 'كلها صح', 'كلها خطأ'], 0,
          'الاستعمار سيطرة لا استقلال؛ الحماية نوعه؛ الأسواق دافع؛ حركات التحرر حديثة؛ وفتح القسطنطينية عزز العثمانيين.'),
        q('السؤال الثاني — التاريخ: اختر: (١) أعلى وظيفة في إدارة الحكم الثنائي: (أ) الحاكم العام (ب) المفتش (ج) السكرتير الإداري (د) العمدة. (٢) قاد جمعية اللواء الأبيض: (أ) علي عبد اللطيف (ب) عثمان دقنة (ج) عبد القادر ود حبوبة (د) المهدي. (٣) العامل الحاسم في مقاومة الاستعمار: (أ) المواجهة المسلحة (ب) ترك البلاد (ج) الهجرة فقط (د) دفع الضرائب. (٤) الدولة التي هزمها العثمانيون في فتح القسطنطينية: (أ) البيزنطية (ب) الأموية (ج) العباسية (د) المهدية.',
          ['١أ، ٢أ، ٣أ، ٤أ', '١ب، ٢ج، ٣د، ٤ب', '١ج، ٢ب، ٣أ، ٤د', '١د، ٢د، ٣ج، ٤ج'], 0,
          'الحاكم العام، علي عبد اللطيف، المواجهة المسلحة، والدولة البيزنطية.'),
        q('السؤال الثالث — الجغرافيا: صح أم خطأ: (١) النيل يجري في السودان من الجنوب إلى الشمال. (٢) التربة في دلتا النيل بركانية. (٣) الزراعة قطاع مهم للاقتصاد السوداني. (٤) الغابات تتأثر بتدرج الأمطار.',
          ['١ صح، ٢ خطأ، ٣ صح، ٤ صح', '١ خطأ، ٢ صح، ٣ خطأ، ٤ صح', 'كلها صح', '١ صح، ٢ صح، ٣ خطأ، ٤ خطأ'], 0,
          'النيل يجري شمالاً؛ الدلتا رسوبية؛ والزراعة والغابات مرتبطتان بالمناخ.'),
        q('السؤال الرابع — الجغرافيا: اختر: (١) عاصمة ولاية نهر النيل: (أ) الدامر (ب) عطبرة (ج) بربر (د) شندي. (٢) يحد السودان شمالاً: (أ) مصر (ب) إثيوبيا (ج) تشاد (د) ليبيا فقط. (٣) من محاصيل المناطق المعتدلة: (أ) الفاكهة (ب) الصمغ فقط (ج) البن (د) المطاط. (٤) تقع مدينة بورتسودان على: (أ) البحر الأحمر (ب) النيل الأزرق (ج) جبل مرة (د) الصحراء الغربية فقط.',
          ['١أ، ٢أ، ٣أ، ٤أ', '١ب، ٢ج، ٣د، ٤ب', '١ج، ٢ب، ٣ج، ٤د', '١د، ٢د، ٣ب، ٤ج'], 0,
          'الدامر عاصمة نهر النيل، ومصر شمالاً، والفاكهة معتدلة، وبورتسودان على البحر الأحمر.'),
        q('السؤال الخامس — أكمل: (١) المسؤول الأعلى في إدارة الحكم الثنائي ..........؛ (٢) القطاع الداعم للاقتصاد السوداني ..........؛ (٣) النهر الذي ينبع من إثيوبيا ..........؛ (٤) شجرة اقتصادية في السافنا الفقيرة ..........',
          ['الحاكم العام، الزراعة، النيل الأزرق، الهشاب', 'المفتش العام، الصناعة، النيل الأبيض، النخيل', 'العمدة، التجارة، عطبرة، التفاح', 'السكرتير، الرعي، القاش، الصنوبر'], 0,
          'هذه إجابات مباشرة من موضوعي التاريخ والجغرافيا.'),
    ]))

social.append(soc_exam('٤',
    '١) ١صح ٢خطأ ٣صح ٤خطأ ٥صح. ٢) ١أ ٢ج ٣ب ٤د. ٣) ١صح ٢صح ٣خطأ ٤صح. ٤) ١ب ٢أ ٣د ٤ج. ٥) ١-الجزيرة ٢-الرهد ٣-الحديد ٤-تسع.', [
        q('السؤال الأول — التاريخ: صح أم خطأ: (١) من نتائج الثورة المهدية إقامة سلطة وطنية. (٢) استمرت الدولة العثمانية بلا تهديد في القرنين الثامن عشر والتاسع عشر. (٣) الاستعمار الاستيطاني يطمس هوية الشعوب. (٤) كان مؤتمر برلين مؤتمراً سودانياً. (٥) استقلال الجزائر من حركات التحرر الوطني.',
          ['١ صح، ٢ خطأ، ٣ صح، ٤ خطأ، ٥ صح', '١ خطأ، ٢ صح، ٣ خطأ، ٤ صح، ٥ خطأ', 'كلها صح', 'كلها خطأ'], 0,
          'الثورة أسست سلطة؛ العثمانيون واجهوا تهديداً؛ الاستيطاني يطمس الهوية؛ برلين أوروبي؛ واستقلال الجزائر تحرر.'),
        q('السؤال الثاني — التاريخ: اختر: (١) هُزم جيش هكس باشا في معركة: (أ) شيكان (ب) كرري (ج) القلابات (د) أم درمان. (٢) توفي الإمام المهدي في: (أ) أم درمان (ب) الجزيرة أبا (ج) الأبيض (د) الخرطوم. (٣) من قادة مقاومة شرق السودان: (أ) عثمان دقنة (ب) علي عبد اللطيف (ج) محمد أحمد المهدي فقط (د) ولزلي. (٤) الحماية تعني: (أ) إشراف دولة استعمارية على دولة ضعيفة (ب) استقلال تام (ج) اتحاد ثقافي (د) تجارة حرة.',
          ['١أ، ٢ب، ٣أ، ٤أ', '١ب، ٢ج، ٣د، ٤ب', '١ج، ٢أ، ٣ب، ٤د', '١د، ٢د، ٣ج، ٤ج'], 0,
          'شيكان، الجزيرة أبا، عثمان دقنة، وتعريف الحماية.'),
        q('السؤال الثالث — الجغرافيا: صح أم خطأ: (١) مشروع الرهد في القضارف. (٢) ينبع النيل الأبيض من بحيرة تانا. (٣) الطاقة الشمسية من الطاقة البديلة. (٤) تزداد كثافة السكان عادة حيث تتوفر المياه وفرص العمل.',
          ['١ صح، ٢ خطأ، ٣ صح، ٤ صح', '١ خطأ، ٢ صح، ٣ خطأ، ٤ صح', 'كلها صح', '١ صح، ٢ صح، ٣ خطأ، ٤ خطأ'], 0,
          'الرهد في القضارف؛ تانا للنيل الأزرق لا الأبيض؛ الشمس بديلة؛ والماء والعمل يجذبان السكان.'),
        q('السؤال الرابع — الجغرافيا: اختر: (١) يروى مشروع الجزيرة من خزان: (أ) مروي (ب) سنار (ج) الروصيرص (د) خشم القربة. (٢) من موارد البحر الأحمر: (أ) الأسماك (ب) القطن (ج) الصمغ فقط (د) القمح. (٣) مدينة صناعية في النيل الأبيض: (أ) جياد (ب) بربر (ج) أركويت (د) سواكن. (٤) عدد دول جوار السودان: (أ) سبع (ب) ثمان (ج) تسع (د) عشر.',
          ['١ب، ٢أ، ٣أ، ٤ج', '١أ، ٢ب، ٣ج، ٤د', '١ج، ٢د، ٣ب، ٤أ', '١د، ٢ج، ٣د، ٤ب'], 0,
          'الجزيرة من خزان سنار؛ البحر الأحمر أسماك؛ جياد في النيل الأبيض؛ والدول تسع.'),
        q('السؤال الخامس — أكمل: (١) أكبر مشروع مروي في السودان مشروع ..........؛ (٢) يقع مشروع .......... في القضارف؛ (٣) من المعادن ..........؛ (٤) عدد دول جوار السودان ..........',
          ['الجزيرة، الرهد، الحديد، تسع', 'الرهد، الجزيرة، الذهب، سبع', 'السوكي، مروي، النحاس، عشر', 'طوكر، حلفا، النفط، خمس'], 0,
          'الجزيرة والرهد والحديد وتسع دول هي الإجابات المناسبة.'),
    ]))

social.append(soc_exam('٥',
    '١) ١خطأ ٢صح ٣صح ٤صح ٥خطأ. ٢) ١ب ٢أ ٣د ٤ج. ٣) ١صح ٢خطأ ٣صح ٤صح. ٤) ١أ ٢ج ٣ب ٤د. ٥) ١-الحماية ٢-النيل الأزرق ٣-السافنا الغنية ٤-بورتسودان.', [
        q('السؤال الأول — التاريخ: صح أم خطأ: (١) قامت الثورة المهدية بسبب الرغبة في استمرار الحكم الأجنبي. (٢) من أهداف المقاومة إقامة سلطة وطنية. (٣) فتح القسطنطينية من الأحداث المهمة للدولة العثمانية. (٤) الاستعمار يبحث عن موارد وأسواق. (٥) ثورة أكتوبر حدثت سنة ١٩٢٤م.',
          ['١ خطأ، ٢ صح، ٣ صح، ٤ صح، ٥ خطأ', '١ صح، ٢ خطأ، ٣ خطأ، ٤ صح، ٥ صح', 'كلها صح', 'كلها خطأ'], 0,
          'الثورة رفضت الحكم الأجنبي؛ المقاومة للسلطة الوطنية؛ فتح القسطنطينية مهم؛ الاستعمار موارد وأسواق؛ أكتوبر ١٩٦٤.'),
        q('السؤال الثاني — التاريخ: اختر: (١) وضع دولة تحت إشراف دولة استعمارية يسمى: (أ) الحماية (ب) الاستقلال (ج) اللامركزية (د) الوحدة. (٢) قائد معركة شيكان من جانب المهدية: (أ) هكس (ب) الأمير محمد ود بشارة/قادة المهدية (ج) ولزلي (د) كتشنر. (٣) ثورة أكتوبر أسقطت نظام: (أ) إبراهيم عبود (ب) جعفر نميري (ج) الحكم التركي (د) المهدية. (٤) من وسائل مقاومة الاستعمار: (أ) التعليم والصحافة والعمل الوطني (ب) قبول السيطرة دائماً (ج) إلغاء الهوية (د) ترك المجتمع.',
          ['١أ، ٢ب، ٣أ، ٤أ', '١ب، ٢أ، ٣ج، ٤د', '١ج، ٢د، ٣ب، ٤ج', '١د، ٢ج، ٣د، ٤ب'], 0,
          'الحماية إشراف؛ النصر في شيكان للمهدية؛ أكتوبر ضد عبود؛ والتعليم والصحافة والعمل الوطني وسائل مقاومة.'),
        q('السؤال الثالث — الجغرافيا: صح أم خطأ: (١) بورتسودان من مدن البحر الأحمر. (٢) النيل الأزرق ينبع من بحيرة فكتوريا. (٣) السافنا الغنية أمطارها أكثر من الفقيرة. (٤) الموارد الطبيعية تؤثر في توزيع السكان.',
          ['١ صح، ٢ خطأ، ٣ صح، ٤ صح', '١ خطأ، ٢ صح، ٣ خطأ، ٤ صح', 'كلها صح', '١ صح، ٢ صح، ٣ خطأ، ٤ خطأ'], 0,
          'بورتسودان بحر أحمر؛ الأزرق من بحيرة تانا؛ السافنا الغنية أكثر مطراً؛ والموارد تجذب السكان.'),
        q('السؤال الرابع — الجغرافيا: اختر: (١) عاصمة البحر الأحمر: (أ) بورتسودان (ب) سواكن (ج) كسلا (د) عطبرة. (٢) ينبع النيل الأزرق من: (أ) بحيرة فكتوريا (ب) بحيرة تانا (ج) البحر الأحمر (د) النيل الأبيض. (٣) الإقليم ذو الأمطار الأعلى بين الآتي: (أ) السافنا الغنية (ب) الصحراء (ج) السافنا الفقيرة (د) شبه الصحراء. (٤) من العوامل البشرية لتوزيع السكان: (أ) المناخ (ب) التضاريس (ج) النشاط الاقتصادي (د) الأمطار.',
          ['١أ، ٢ب، ٣أ، ٤ج', '١ب، ٢أ، ٣ب، ٤د', '١ج، ٢د، ٣ج، ٤أ', '١د، ٢ج، ٣د، ٤ب'], 0,
          'بورتسودان عاصمة البحر الأحمر؛ الأزرق من تانا؛ السافنا الغنية أعلى مطراً؛ والنشاط الاقتصادي عامل بشري.'),
        q('السؤال الخامس — أكمل: (١) إشراف دولة استعمارية على دولة ضعيفة يسمى ..........؛ (٢) ينبع النيل الأزرق من بحيرة ..........؛ (٣) الإقليم النباتي الأعلى مطراً هو ..........؛ (٤) عاصمة ولاية البحر الأحمر ..........',
          ['الحماية، تانا، السافنا الغنية، بورتسودان', 'الانتداب، فكتوريا، الصحراء، سواكن', 'الوصاية، مروي، السافنا الفقيرة، كسلا', 'الاستقلال، سنار، الغابات، عطبرة'], 0,
          'الحماية وتانا والسافنا الغنية وبورتسودان من حقائق المنهج.'),
    ]))

root = '/home/user/Middle-School-Students/shared/exams'
os.makedirs(root, exist_ok=True)
for subject, data in [('english', english), ('arabic', arabic), ('islamic', islamic), ('social', social)]:
    with open(os.path.join(root, subject + '.json'), 'w', encoding='utf-8') as f:
        json.dump({'subjectId': subject, 'exams': data}, f, ensure_ascii=False, indent=2)
    print(f'✅ {subject}.json: {len(data)} امتحانات × {len(data[0]["questions"])} أسئلة + مفاتيح')
