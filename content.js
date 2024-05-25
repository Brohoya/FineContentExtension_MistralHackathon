export { };

console.log("CONTENT SCRIPT RUNNING!");

function getDomPath(element) {
    const path = [];
    while (element) {
        let name = element.nodeName.toLowerCase();
        if (element.id) {
            name += `#${element.id}`;
            path.unshift(name);
            break;
        } else {
            let sibling = element, count = 1;
            while (sibling.previousElementSibling) {
                sibling = sibling.previousElementSibling;
                count++;
            }
            name += `[${count}]`;
        }
        path.unshift(name);
        element = element.parentElement;
    }
    return path.join("/");
}

function isVisible(element) {
    return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
}

function traverseDom(node) {
    const results = [];
    const tagsToInclude = ['p', 'article', 'section', 'blockquote'];

    if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();

        if (tagsToInclude.includes(tagName) && isVisible(node)) {
            const text = node.innerText.trim();
            if (text) {
                const sentences = text.split(/(?<=[.!?])\s+/); // Split text by punctuation followed by space
                sentences.forEach(sentence => {
                    const words = sentence.split(/\s+/);
                    if (words.length > 5) {
                        results.push({
                            id: getDomPath(node),
                            text: sentence.trim()
                        });
                    }
                });
            }
        } else {
            for (let child = node.firstChild; child; child = child.nextSibling) {
                results.push(...traverseDom(child));
            }
        }
    }

    return results;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getDOM") {
        const domData = traverseDom(document.body);
        sendResponse({ domData });
    } else if (request.action === "highlightElement") {
        highlightElementByPath(request.path);
    }
});

function getElementByPath(path) {
    const parts = path.split('/');
    let element = document;

    for (const part of parts) {
        const [tag, index] = part.split('[');
        const tagName = tag.includes('#') ? tag.split('#')[0] : tag;
        const id = tag.includes('#') ? tag.split('#')[1] : null;

        if (id) {
            element = element.querySelector(`#${id}`);
        } else if (index) {
            const idx = parseInt(index.replace(']', '')) - 1;
            element = element.querySelectorAll(tagName)[idx];
        } else {
            element = element.querySelector(tagName);
        }

        if (!element) {
            return null;
        }
    }

    return element;
}

function highlightElementByPath(path) {
    const element = getElementByPath(path);
    if (element) {
        element.style.backgroundColor = 'yellow';
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

