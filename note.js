// Supabase 设置
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// 初始化 Supabase 客户端
const SUPABASE_URL = 'https://trkbnxkkegwrhnboidwi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRya2JueGtrZWd3cmhuYm9pZHdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk0MDE4MzQsImV4cCI6MjA0NDk3NzgzNH0.wlFGKI03di0llAcuqUtTC5YUDt_pt05o_VySxECj2F0';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// 初始化 Quill 编辑器
// 初始化 Quill 编辑器
const quill = new Quill('#editor', {
    theme: 'snow',
    modules: {
        toolbar: [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline'],
            ['image', 'code-block'],
            [{ 'align': [] }],  // 允许选择对齐方式
            ['clean'] // 清除格式
        ]
    }
});

// 强制左对齐
quill.root.style.textAlign = 'justify';

// 设置默认对齐为左对齐
quill.format('align', 'justify');

// 全局变量
let notes = [];
let isEditable = true; // 控制是否显示编辑和删除按钮


// 设置激活状态
function setActive(element) {
    const links = document.querySelectorAll('.navbar a');
    links.forEach(link => link.classList.remove('active'));
    element.classList.add('active');
}

// 显示输入框
function showInputFields() {
    isEditable = true; // 创建笔记时允许编辑
    document.getElementById('inputFields').style.display = 'block';
    document.getElementById('createButton').style.display = 'none';
}

// 取消输入
function cancelInput() {
    document.getElementById('inputFields').style.display = 'none';
    document.getElementById('createButton').style.display = '';
    clearInputs();
}

// 清空输入框
function clearInputs() {
    document.getElementById('titleInput').value = '';
    document.getElementById('textInput').value = '';
}

quill.root.addEventListener('paste', (e) => {
    e.preventDefault(); // 阻止默认的粘贴行为
    const items = e.clipboardData.items;
    let imageInserted = false; // 标记是否插入过图片

    for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/') && !imageInserted) {
            const file = items[i].getAsFile();
            const reader = new FileReader();
            reader.onload = () => {
                const range = quill.getSelection();
                if (range) {
                    quill.insertEmbed(range.index, 'image', reader.result); // 插入图片
                    quill.format('align', 'left'); // 确保插入后左对齐
                }
            };
            reader.readAsDataURL(file);
            imageInserted = true; // 标记插入过图片
            break; // 找到一张图片后退出循环
        }
    }
});

// 保存笔记时获取内容
async function saveNote() {
    const title = document.getElementById('titleInput').value;
    const text = quill.root.innerHTML; // 获取 Quill 编辑器中的 HTML 内容

    if (title && text) {
        const note = {
            title,
            text,
            createdAt: new Date().toISOString(),
        };
        notes.push(note);
        await saveNoteToSupabase(note); // 保存到 Supabase
        renderNotes(); // 重新渲染笔记
        cancelInput();
    } else {
        alert("请填写标题和内容");
    }
}
// 渲染笔记
function renderNotes() {
    const notesContainer = document.getElementById('notesContainer');
    notesContainer.innerHTML = '';

    notes.forEach((note, index) => {
        const noteElement = document.createElement('div');
        noteElement.classList.add('note');
        noteElement.innerHTML = `
            <h2 style="text-align: center; font-weight: bold;">${note.title}</h2>
            <div id='notetext'>
                <p id='note_text_content' style="text-align: right;">${note.text}</p>
                <p id='note_text_time' style="text-align: right; font-size: 0.8em; color: gray;">创建时间: ${new Date(note.createdAt).toLocaleString()}</p>
            </div>
        `;

        // 仅为最新添加的笔记添加修改和删除按钮
        if (index === notes.length - 1 && !isPageReloaded) {
            noteElement.innerHTML += `
            `;
        }

        notesContainer.appendChild(noteElement);
    });
}

// 在页面加载时的变量
let isPageReloaded = true; // 用于标记页面是否重新加载

// 从 Supabase 获取已有内容
async function fetchNotes() {
    const { data, error } = await supabase
        .from('self')
        .select('*');

    if (error) {
        console.error("获取笔记失败:", error);
    } else {
        notes = data.map(item => ({
            id: item.id,
            title: item.note_title,
            text: item.note_text,
            createdAt: item.created_at
        }));
        renderNotes();
        isPageReloaded = false; // 页面首次加载后，设置为 false
    }
}

// 删除笔记
async function deleteNote(index) {
    const noteId = notes[index].id; // 获取笔记的 ID
    await deleteNoteFromSupabase(noteId); // 从 Supabase 删除
    notes.splice(index, 1);
    renderNotes();
}

// 修改笔记
function editNote(index) {
    const note = notes[index];
    document.getElementById('titleInput').value = note.title;
    document.getElementById('textInput').value = note.text;
    document.getElementById('saveButton').onclick = function () { saveEdit(index); };
    document.getElementById('inputFields').style.display = 'block';
    document.getElementById('createButton').style.display = 'none';
}

// 保存修改
async function saveEdit(index) {
    const title = document.getElementById('titleInput').value;
    const text = document.getElementById('textInput').value;

    if (title && text) {
        notes[index] = { ...notes[index], title, text, createdAt: new Date().toISOString() };
        await updateNoteInSupabase(notes[index]); // 更新 Supabase
        renderNotes();
        cancelInput();
    } else {
        alert("请填写标题和内容");
    }
}



// 保存笔记到 Supabase
async function saveNoteToSupabase(note) {
    const { data, error } = await supabase
        .from('self')
        .insert([{
            note_title: note.title,
            note_text: note.text,
            created_at: note.createdAt
        }]);

    if (error) {
        console.error("保存笔记失败:", error);
    } else {
        if (data && data.length > 0) {
            note.id = data[0].id; // 保存 ID
        } else {
            console.error("没有返回数据，无法获取 ID");
        }
    }
}

// 从 Supabase 删除笔记
async function deleteNoteFromSupabase(noteId) {
    const { error } = await supabase
        .from('self')
        .delete()
        .eq('id', noteId);

    if (error) {
        console.error("删除笔记失败:", error);
    }
}

// 更新 Supabase 中的笔记
async function updateNoteInSupabase(note) {
    const { error } = await supabase
        .from('self')
        .update({
            note_title: note.title,
            note_text: note.text,
            created_at: note.createdAt
        })
        .eq('id', note.id);

    if (error) {
        console.error("更新笔记失败:", error);
    }
}
function filterNotes() {
    const filterText = document.getElementById('filterInput').value.trim();
    const filteredNotes = notes.filter(note =>
        note.title && note.title.includes(filterText)  // 根据标题筛选
    );
    renderNotes(filteredNotes);
}

window.showInputFields = showInputFields
window.setActive = setActive
window.cancelInput = cancelInput
window.saveNote = saveNote
window.deleteNote = deleteNote
window.editNote = editNote
window.filterNotes = filterNotes
// 页面加载时获取已有内容
fetchNotes();
