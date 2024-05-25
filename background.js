// chrome.webNavigation.onHistoryStateUpdated.addListener(function(details) {
//     // Check if the URL has changed
//     console.log("URL changed to: " + details.url);
//     // Call your function here
//     handleUrlChange(details.url);
//   });

//   chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
//     if (changeInfo.url) {
//       console.log("URL changed to: " + changeInfo.url);
//       // Call your function here
//       handleUrlChange(changeInfo.url);
//     }
//   });
import { text } from 'stream/consumers';
import dom_parser from './parser.ts';
export { };

console.log("BACKGROUND UP AND RUNNING!");

function chunkArray(array, size) {
    const chunkedArr = [];
    for (let i = 0; i < array.length; i += size) {
        chunkedArr.push(array.slice(i, i + size));
    }
    return chunkedArr;
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        const url = new URL(tab.url);
        const hostname = url.hostname;

        console.log(`URL CHANGED: ${url}`);
        chrome.tabs.sendMessage(tabId, { action: "getDOM" }, async (response) => {
            if (response) {
                console.log("DOM content:", response.domData);

                const sentenceChunks = chunkArray(response.domData, 6);

                chrome.tabs.sendMessage(tabId, { action: "getDOM" }, async (response) => {
                    if (response) {
                        console.log("DOM content:", response.domData);

                        const sentenceChunks = chunkArray(response.domData, 6);

                        const fetchPromises = sentenceChunks.map(chunk => {
                            return fetch("http://127.0.0.1:5000/text_chunk", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(chunk),
                            })
                                .then(response => response.json())
                                .then(data => {
                                    return data.map((sentence, index) => {
                                        console.log(`Result: ${sentence.classification}: ${chunk[index].text}`);
                                        if (sentence.classification !== "not moderated") {
                                            chrome.tabs.sendMessage(tabId, { action: "highlightElement", path: chunk[index].id, context: sentence.context });
                                        }

                                        return ({
                                            classification: sentence.classification,
                                            text: chunk[index].text,
                                            sentenceId: chunk[index].id,
                                        })
                                    });
                                })
                                .catch(error => {
                                    console.error("Error fetching data:", error);
                                    console.error("Fucked up chunk:", chunk);
                                });
                        });

                        // Use Promise.all to wait for all fetch requests to complete
                        const results = await Promise.all(fetchPromises);

                        // Process the results
                        // results.flat().forEach(result => {
                        //     console.log(`Result: ${result.classification}: ${result.text}`);
                        //     if (result.classification !== "not moderated") {
                        //         chrome.tabs.sendMessage(tabId, { action: "highlightElement", path: result.sentenceId });
                        //     }
                        // });
                    }
                });
            }
        });
    }
})