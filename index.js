import { chat, saveChatConditional, reloadCurrentChat } from '../../../../script.js';
import { SlashCommand } from '../../../slash-commands/SlashCommand.js';
import { ARGUMENT_TYPE, SlashCommandArgument, SlashCommandNamedArgument } from '../../../slash-commands/SlashCommandArgument.js';
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { isTrueBoolean } from '../../../utils.js';

// /avatarassets 명령어 등록
SlashCommandParser.addCommandObject(SlashCommand.fromProps({ 
    name: 'avatarassets',
    callback: async(args, value) => {
        const avatarPath = value?.trim();
        if (!avatarPath) {
            throw new Error('/avatarassets requires avatar path');
        }
        
        let mesId = /**@type {number}*/(args.id);
        
        // id가 제공되지 않은 경우, 마지막 메시지를 대상으로 함
        if (mesId === undefined || mesId === null) {
            mesId = chat.length - 1;
            if (mesId < 0) {
                throw new Error('No messages in chat to apply avatar to');
            }
        }
        
        await setForceAvatar(mesId, avatarPath);
        
        // 화면 즉시 업데이트
        const shouldAwait = isTrueBoolean(args?.await);
        if (shouldAwait) {
            await reloadCurrentChat();
        } else {
            // 비동기로 채팅 새로고침 (기본값)
            reloadCurrentChat();
        }
        
        return avatarPath;
    },
    namedArgumentList: [
        SlashCommandNamedArgument.fromProps({ 
            name: 'id',
            description: 'message id (0-based index). If not provided, applies to the last message',
            typeList: [ARGUMENT_TYPE.NUMBER],
            isRequired: false,
        }),
        SlashCommandNamedArgument.fromProps({ 
            name: 'await',
            description: 'whether to await chat reload before continuing (default: false)',
            typeList: [ARGUMENT_TYPE.BOOLEAN],
            isRequired: false,
            defaultValue: 'false',
        }),
    ],
    unnamedArgumentList: [
        SlashCommandArgument.fromProps({ 
            description: 'avatar path (e.g., "/characters/Seraphina/fear.png")',
            typeList: [ARGUMENT_TYPE.STRING],
            isRequired: true,
        }),
    ],
    helpString: `
        <div>
            Set a force_avatar for a specific message and reload chat to show the change immediately.
        </div>
        <div>
            <strong>Examples:</strong>
            <ul>
                <li>
                    <pre><code class="language-stscript">/avatarassets id=8 "/characters/Seraphina/fear.png"</code></pre>
                    Sets avatar for message at index 8 and reloads chat
                </li>
                <li>
                    <pre><code class="language-stscript">/sendas name=깡통 hi | /avatarassets "/characters/Seraphina/fear.png"</code></pre>
                    Sends message as 깡통 and applies avatar to that new message
                </li>
                <li>
                    <pre><code class="language-stscript">/avatarassets id=8 await=true "/characters/Seraphina/fear.png"</code></pre>
                    Waits for chat reload before continuing to next command
                </li>
            </ul>
        </div>
    `,
}));

// /deleteavatarassets 명령어 등록
SlashCommandParser.addCommandObject(SlashCommand.fromProps({ 
    name: 'deleteavatarassets',
    callback: async(args, value) => {
        let mesId = /**@type {number}*/(args.id ?? value);
        if (mesId === undefined || mesId === null) {
            throw new Error('/deleteavatarassets requires id parameter');
        }
        
        // value로 들어온 경우 숫자로 변환
        if (typeof mesId === 'string') {
            mesId = Number(mesId);
            if (Number.isNaN(mesId)) {
                throw new Error('/deleteavatarassets id must be a number');
            }
        }
        
        await deleteForceAvatar(mesId);
        
        // 화면 즉시 업데이트
        const shouldAwait = isTrueBoolean(args?.await);
        if (shouldAwait) {
            await reloadCurrentChat();
        } else {
            // 비동기로 채팅 새로고침 (기본값)
            reloadCurrentChat();
        }
        
        return '';
    },
    namedArgumentList: [
        SlashCommandNamedArgument.fromProps({ 
            name: 'id',
            description: 'message id (0-based index)',
            typeList: [ARGUMENT_TYPE.NUMBER],
            isRequired: false,
        }),
        SlashCommandNamedArgument.fromProps({ 
            name: 'await',
            description: 'whether to await chat reload before continuing (default: false)',
            typeList: [ARGUMENT_TYPE.BOOLEAN],
            isRequired: false,
            defaultValue: 'false',
        }),
    ],
    unnamedArgumentList: [
        SlashCommandArgument.fromProps({ 
            description: 'message id (0-based index)',
            typeList: [ARGUMENT_TYPE.NUMBER],
            isRequired: false,
        }),
    ],
    helpString: `
        <div>
            Delete the force_avatar from a specific message and reload chat to show the change immediately.
        </div>
        <div>
            <strong>Example:</strong>
            <ul>
                <li>
                    <pre><code class="language-stscript">/deleteavatarassets id=8</code></pre>
                </li>
                <li>
                    <pre><code class="language-stscript">/deleteavatarassets 8</code></pre>
                </li>
                <li>
                    <pre><code class="language-stscript">/deleteavatarassets id=8 await=true</code></pre>
                    Waits for chat reload before continuing to next command
                </li>
            </ul>
        </div>
    `,
}));

/**
 * 특정 메시지에 force_avatar 설정
 * @param {number} mesId - 메시지 인덱스 (0-based)
 * @param {string} avatarPath - 아바타 경로
 */
const setForceAvatar = async(mesId, avatarPath) => {
    if (mesId < 0 || mesId >= chat.length) {
        throw new Error(`message ${mesId} does not exist (valid range: 0-${chat.length - 1})`);
    }
    
    const mes = chat[mesId];
    if (!mes) {
        throw new Error(`message ${mesId} does not exist`);
    }
    
    // force_avatar 설정
    mes.force_avatar = avatarPath;
    
    // 즉시 저장 (디바운스 없이)
    await saveChatConditional();
    
    // DOM에서 해당 메시지의 아바타 이미지를 직접 업데이트
    const avatarImg = document.querySelector(`#chat [mesid="${mesId}"] .avatar img`);
    if (avatarImg) {
        // 캐시 방지를 위해 타임스탬프 추가
        avatarImg.src = `${avatarPath}?t=${Date.now()}`;
    }
};

/**
 * 특정 메시지에서 force_avatar 삭제
 * @param {number} mesId - 메시지 인덱스 (0-based)
 */
const deleteForceAvatar = async(mesId) => {
    if (mesId < 0 || mesId >= chat.length) {
        throw new Error(`message ${mesId} does not exist (valid range: 0-${chat.length - 1})`);
    }
    
    const mes = chat[mesId];
    if (!mes) {
        throw new Error(`message ${mesId} does not exist`);
    }
    
    // force_avatar 삭제
    if (mes.force_avatar !== undefined) {
        delete mes.force_avatar;
    }
    
    // 즉시 저장 (디바운스 없이)
    await saveChatConditional();
    
    // original_avatar가 있으면 그것으로 복원, 없으면 기본 아바타로 복원
    // 이 부분은 reloadCurrentChat()이 처리하도록 맡김
};
