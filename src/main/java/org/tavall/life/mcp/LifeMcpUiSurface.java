package org.tavall.life.mcp;

import io.modelcontextprotocol.server.McpServerFeatures.SyncResourceSpecification;
import io.modelcontextprotocol.spec.McpSchema;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/** Java-owned MCP App resources built from the accepted Life Agent Glass design system. */
public final class LifeMcpUiSurface {
    public static final String MIME_TYPE = "text/html;profile=mcp-app";
    private static final List<String> SURFACES = List.of(
            "choices", "commitment", "handoff", "execution", "outcome", "settings", "capability-route"
    );

    private LifeMcpUiSurface() {
    }

    public static List<SyncResourceSpecification> resources() {
        return SURFACES.stream().map(LifeMcpUiSurface::resource).toList();
    }

    public static List<String> resourceUris() {
        return SURFACES.stream().map(LifeMcpUiSurface::uri).toList();
    }

    private static SyncResourceSpecification resource(String surface) {
        String uri = uri(surface);
        McpSchema.Resource resource = McpSchema.Resource.builder()
                .uri(uri)
                .name("life-agent-" + surface + "-ui")
                .description("Java-owned Life Agent " + surface + " MCP App surface")
                .mimeType(MIME_TYPE)
                .build();
        String document = documentFor(surface);
        return new SyncResourceSpecification(
                resource,
                (exchange, request) -> new McpSchema.ReadResourceResult(
                        List.of(new McpSchema.TextResourceContents(uri, MIME_TYPE, document, Map.of())), null
                )
        );
    }

    private static String uri(String surface) {
        return "ui://life-agent/" + surface + "-v2.html";
    }

    public static String documentFor(String surface) {
        return "<!doctype html><html lang=\"en\"><head>"
                + "<meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
                + "<meta name=\"mcp-app-mime\" content=\"" + MIME_TYPE + "\">"
                + "<meta name=\"referrer\" content=\"no-referrer\">"
                + "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; font-src 'none'; media-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'\">"
                + "<title>Life Agent " + surface + "</title><style>" + styles() + "</style></head>"
                + "<body data-mcp-app-surface=\"" + surface + "\"><main id=\"app\"></main><script>"
                + bootstrap() + "window.render=" + renderer(surface) + ";window.render(readModel());"
                + "</script></body></html>";
    }

    private static String styles() {
        String source;
        try (InputStream input = LifeMcpUiSurface.class.getResourceAsStream(
                "/life-agent/life-agent-glass-ui-system.html"
        )) {
            if (input == null) {
                throw new IllegalStateException("Java Life Agent Glass UI resource is missing");
            }
            source = new String(input.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to read Java Life Agent Glass UI resource", exception);
        }
        int start = source.indexOf("<style>");
        int end = source.indexOf("</style>");
        if (start < 0 || end <= start) {
            throw new IllegalStateException("Java Life Agent Glass UI resource has no style block");
        }
        String css = source.substring(start + "<style>".length(), end)
                .replaceAll("url\\((['\"])https?://[^)]*?\\1\\)", "var(--life-agent-image, none)")
                .replaceAll("(?i)<img\\s+class=\"icon\"\\s+src=\"https?://[^\"]+\">", "");
        return css + ""
                + "body{padding:0}.mcp-page{max-width:920px;margin:auto;padding:18px 16px 24px}.mcp-page .hero{align-items:flex-start;margin-bottom:14px}.mcp-page .hero h1{font-size:25px}.mcp-page .hero p{max-width:670px}.mcp-shell{border:1px solid var(--hairline);border-radius:22px;background:rgba(17,18,21,.64);box-shadow:0 20px 50px rgba(0,0,0,.28);overflow:hidden}.mcp-shell>.head{border-bottom:1px solid var(--hairline);background:rgba(255,255,255,.025)}.mcp-shell>.body{padding:0 16px 17px}.mcp-shell .section-title{margin-top:17px}.mcp-card{border:1px solid rgba(255,255,255,.11);background:rgba(18,19,22,.46);backdrop-filter:blur(24px);border-radius:16px;padding:13px}.mcp-card.selected{border-color:rgba(255,255,255,.35);background:rgba(35,37,42,.62)}.mcp-card .title{font-size:16px}.mcp-card .meta{color:var(--secondary)}.mcp-stack{display:grid;gap:0;border:1px solid rgba(255,255,255,.1);border-radius:16px;overflow:hidden;background:rgba(18,19,22,.35)}.mcp-stack .item{border-top:1px solid rgba(255,255,255,.08)}.mcp-stack .item:first-child{border-top:0}.mcp-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.mcp-actions .btn{cursor:pointer}.mcp-boundary{border:1px solid rgba(242,209,155,.36);background:rgba(242,209,155,.1);border-radius:16px;padding:13px;color:var(--secondary)}.mcp-boundary strong{display:block;color:var(--warn);margin-bottom:4px}.mcp-route{display:flex;align-items:stretch;gap:8px;overflow-x:auto}.mcp-route-node{min-width:150px;flex:1 0 150px;border:1px solid rgba(255,255,255,.11);background:rgba(18,19,22,.42);border-radius:16px;padding:12px}.mcp-route-arrow{align-self:center;color:var(--tertiary);font-size:18px}.mcp-receipt{border:1px solid rgba(166,234,189,.32);background:rgba(166,234,189,.1);border-radius:20px;padding:15px}.mcp-receipt .title{font-size:18px}.mcp-status{font-size:12px;color:var(--secondary)}.mcp-status.good{color:var(--good)}.mcp-status.warn{color:var(--warn)}.mcp-privacy{font-size:12px;color:var(--tertiary);line-height:1.5;margin-top:14px}.mcp-provider{font-size:11px;color:var(--secondary);border:1px solid var(--hairline);border-radius:999px;padding:4px 8px;white-space:nowrap}.mcp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.mcp-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.mcp-setting{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:12px;border-top:1px solid rgba(255,255,255,.08)}.mcp-setting:first-child{border-top:0}.mcp-setting strong{display:block;font-size:13px}.mcp-setting span{display:block;font-size:11.5px;color:var(--secondary);margin-top:3px}.mcp-toggle{width:40px;height:23px;border-radius:999px;background:rgba(151,207,255,.55);position:relative;flex:0 0 auto}.mcp-toggle:after{content:\"\";position:absolute;width:17px;height:17px;top:3px;right:3px;background:#fff;border-radius:50%}@media(max-width:700px){.mcp-grid,.mcp-grid3{grid-template-columns:1fr}.mcp-route{padding-bottom:3px}}";
    }

    private static String bootstrap() {
        return """
                const root=document.getElementById('app');
                const e=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n};
                const clear=()=>{root.replaceChildren();return root};
                const text=(value,fallback='')=>value===undefined||value===null||String(value).trim()===''?fallback:String(value);
                const readModel=()=>{const value=window.openai?.toolOutput??window.openai?.toolInput??{};if(typeof value==='string'){try{return JSON.parse(value)}catch{return {}}}return value&&typeof value==='object'?value:{}};
                const post=(method,params={})=>{if(window.parent&&window.parent!==window)window.parent.postMessage({jsonrpc:'2.0',method,params},'*')};
                const send=(message)=>post('ui/message',{message:{role:'user',content:[{type:'text',text:String(message||'Continue')}]}});
                const context=(id,value)=>post('ui/update-model-context',{modelContext:{decisionId:text(id),decisionValue:text(value)}});
                const button=(label,primary=false,handler=null)=>{const n=e('button','btn'+(primary?' primary':''),label||'Continue');n.type='button';if(handler)n.addEventListener('click',handler);return n};
                const section=(label,content)=>{const n=e('div','section-title',label);if(content)n.append(content);return n};
                const mark=(provider)=>e('span','fallback',text(provider,'LA').split(/\\s+/).map(x=>x[0]||'').slice(0,2).join('').toUpperCase());
                const stackItem=(label,detail,status='pending',provider='')=>{const row=e('div','item'),check=e('div','check '+status,status==='done'?'✓':status==='active'?'•':status==='warn'?'!':'');const main=e('div','item-main');main.append(e('div','item-label',text(label,'Step')),e('div','item-detail',text(detail,'')));row.append(check,main);if(provider)row.append(e('span','mcp-provider',provider));return row};
                const shell=(eyebrow,title,summary)=>{const page=clear(),hero=e('div','hero'),copy=e('div');copy.append(e('div','eyebrow',eyebrow),e('h1','',title));if(summary)copy.append(e('p','',summary));hero.append(copy,e('div','local','LIFE AGENT'));page.append(hero);return page};
                const card=(title,detail,provider,selected=false)=>{const n=e('div','mcp-card'+(selected?' selected':'')),top=e('div','row between');top.append(e('div','title',title),e('span','mcp-provider',provider));n.append(top);if(detail)n.append(e('div','meta',detail));return n};
                const body=(page)=>{const shell=e('div','mcp-shell'),head=e('div','head'),copy=e('div');copy.append(e('div','eyebrow','Java-owned MCP App'),e('div','title','Life Agent'));head.append(copy);shell.append(head);const b=e('div','body');shell.append(b);page.append(shell);return b};
                const list=(items)=>{const n=e('div','mcp-stack');for(const item of items)n.append(stackItem(item.label,item.detail,item.status,item.provider));return n};
                window.addEventListener('message',(event)=>{const message=event.data;if(!message||typeof message!=='object')return;if(message.method==='ui/initialize'){post('ui/size',{width:'auto',height:document.body.scrollHeight})}if(message.method==='ui/update-model-context')window.render(readModel())});
                post('ui/initialize',{protocolVersion:'2026-01-26',capabilities:{modelContext:true,messages:true,teardown:true,sizing:true}});
                """;
    }

    private static String renderer(String surface) {
        return switch (surface) {
            case "choices" -> choicesRenderer();
            case "commitment" -> commitmentRenderer();
            case "handoff" -> handoffRenderer();
            case "execution" -> executionRenderer();
            case "outcome" -> outcomeRenderer();
            case "settings" -> settingsRenderer();
            case "capability-route" -> routeRenderer();
            default -> throw new IllegalArgumentException("Unknown Life Agent UI surface: " + surface);
        };
    }

    private static String choicesRenderer() {
        return """
                (d={})=>{const page=shell('Life Agent · choice',text(d.title,'Choose the plan that protects your afternoon'),text(d.summary,'A small set of options, compared by the outcome you asked for.'));const b=body(page);b.append(section('Recommended path'));const grid=e('div','mcp-grid3');const options=Array.isArray(d.options)&&d.options.length?d.options:[{id:'alaska-421',title:'Alaska 421',subtitle:'Nonstop · LAX → SEA · 2h 49m',price:'$284',facts:['10:20 → 1:09','Carry-on'],reason:'Closest to your preferred time',provider:'Alaska',recommended:true},{id:'delta-881',title:'Delta 881',subtitle:'1 stop · LAX → SEA · 4h 12m',price:'$251',facts:['Save $33','Longer connection'],reason:'Cheaper, but costs two hours',provider:'Delta'},{id:'united-204',title:'United 204',subtitle:'Nonstop · LAX → SEA · 2h 46m',price:'$319',facts:['11:05 → 1:51','Later'],reason:'Simple later fallback',provider:'United'}];for(const [i,o] of options.slice(0,8).entries()){const c=e('article','option'+(o.recommended?' best':''));const top=e('div','top');top.append(mark(o.provider||o.title));const title=e('div','item-main');title.append(e('div','eyebrow',o.recommended?'Recommended':'Option '+(i+1)),e('div','title',text(o.title,'Option')));if(o.subtitle)title.append(e('div','meta',o.subtitle));top.append(title);c.append(top);if(o.price)c.append(e('div','value',o.price));if(Array.isArray(o.facts)){const tags=e('div','tags');for(const fact of o.facts.slice(0,5))tags.append(e('span','',fact));c.append(tags)}if(o.reason)c.append(e('div','reason',o.reason));const actions=e('div','actions'),choose=button('Choose',Boolean(o.recommended),()=>context(o.id||o.title,o.title));actions.append(choose);c.append(actions);grid.append(c)}b.append(grid);const note=e('div','mcp-privacy','Life Agent keeps the choice small. Provider authentication and consequential confirmation stay outside this read-only surface.');b.append(note);return page}
                """;
    }

    private static String commitmentRenderer() {
        return """
                (d={})=>{const page=shell('Life Agent · commitment',text(d.title,'Make the smallest decision'),text(d.summary,'You chose a direction. Here is what it creates before anything consequential happens.'));const b=body(page);b.append(section('Selected option'));b.append(card(text(d.selected?.label,'Alaska 421 · nonstop to Seattle'),'Friday · 10:20 AM · $284','Alaska',true));b.append(section('What this creates'),list([{label:'Calendar hold',detail:'Add the flight window and airport buffer to the test calendar.',status:'pending',provider:'Google Calendar'},{label:'Arrival follow-up',detail:'Prepare a reminder for ground transport only if the schedule is confirmed.',status:'pending',provider:'Host task'},{label:'Travel note',detail:'Keep the selected flight and constraints together for the next step.',status:'pending',provider:'Life Agent'}]));const boundary=e('div','mcp-boundary');boundary.append(e('strong','Approval boundary'),e('span','Payment, booking, and any changed terms return to you before confirmation.'));b.append(section('Before we continue',boundary));const actions=e('div','mcp-actions');actions.append(button('Continue to handoff',true,()=>send('Continue to the provider handoff')));b.append(actions);return page}
                """;
    }

    private static String handoffRenderer() {
        return """
                (d={})=>{const page=shell('Life Agent · handoff',text(d.title,'A quick step for you'),text(d.summary,'One narrow provider step remains with the person who owns the account.'));const b=body(page);b.append(section('Why you are seeing this'));const trust=e('div','mcp-boundary');trust.append(e('strong','Google Calendar + Gmail'),e('span','The host owns the authenticated provider session. Life Agent does not receive or retain passwords, cookies, MFA codes, or access tokens.'));b.append(trust);b.append(section('Complete in the provider'),list([{label:'Review the calendar hold',detail:'Confirm the time zone and the private test-calendar visibility.',status:'active',provider:'Google Calendar'},{label:'Review the prepared email',detail:'The draft remains unsent until you decide what should leave the account.',status:'active',provider:'Gmail'},{label:'Return to Life Agent',detail:'The task resumes from the verified provider result.',status:'pending',provider:'Life Agent'}]));const actions=e('div','mcp-actions');actions.append(button('I am done',true,()=>send('The provider handoff is complete')));b.append(actions);return page}
                """;
    }

    private static String executionRenderer() {
        return """
                (d={})=>{const page=shell('Life Agent · live execution',text(d.title||d.outcome,'Preparing your trip'),text(d.summary,'Every step reports its own state. Waiting is visible; success is not assumed.'));const b=body(page);const status=text(d.status,'waiting_for_user');const badge=e('div','status '+(status==='completed'?'good':status==='waiting_for_user'?'warn':''),status.replaceAll('_',' '));b.parentElement.querySelector('.head').append(badge);b.append(section('Execution'),list(Array.isArray(d.steps)&&d.steps.length?d.steps:[{label:'Plan outcome',detail:'Trip preparation plan created in Java.',status:'done',provider:'Life Agent'},{label:'Resolve capability route',detail:'Calendar and email routes selected from host capabilities.',status:'done',provider:'Java MCP'},{label:'Prepare provider actions',detail:'Actions are recorded and waiting for your approval.',status:'warn',provider:'Google'}]));if(d.handoff){const box=e('div','mcp-boundary');box.append(e('strong',text(d.handoff.label,'Needs you')),e('span',text(d.handoff.reason,'The next step is consequential or account-owned.')));b.append(section('Required handoff',box))}b.append(e('div','mcp-privacy','Execution state is Java-owned. Provider effects are only reported after the host returns a result.'));return page}
                """;
    }

    private static String outcomeRenderer() {
        return """
                (d={})=>{const page=shell('Life Agent · outcome',text(d.title,'Outcome ready'),text(d.summary,'A compact receipt of what became true and what still needs your attention.'));const b=body(page);const receipt=e('div','mcp-receipt');receipt.append(e('div','eyebrow',text(d.status,'verified')),e('div','title',text(d.receipt?.label,'Trip preparation is ready')),e('div','item-detail',text(d.receipt?.detail,'The selected plan and follow-through context are ready for the next provider step.')));b.append(receipt);b.append(section('Next consequences'),list([{label:'Calendar',detail:'Private test event prepared; verify the provider ID before keeping it.',status:'done',provider:'Google Calendar'},{label:'Email',detail:'Draft prepared; sent=false until you explicitly approve sending.',status:'warn',provider:'Gmail'},{label:'Travel',detail:'Booking remains a human-approved handoff.',status:'pending',provider:'Provider'}]));const actions=e('div','mcp-actions');actions.append(button('Review details',false,()=>send('Review the verified outcome details')),button('Done',true,()=>send('The outcome is accepted')));b.append(actions);return page}
                """;
    }

    private static String settingsRenderer() {
        return """
                (d={})=>{const page=shell('Life Agent · settings',text(d.title,'How Life Agent handles the rest'),text(d.summary,'Preferences shape follow-through. Secrets and irreversible actions stay protected.'));const b=body(page);b.append(section('Behavior'));const group=e('div','mcp-stack');for(const item of [{title:'Handle follow-ups',detail:'Create justified calendar, reminder, or message context after an outcome.'},{title:'Avoid duplicate notifications',detail:'Prefer provider-owned reminders when they already cover the result.'},{title:'Use browser fallback',detail:'Continue through websites only in a task-scoped ephemeral session.'}]){const row=e('div','mcp-setting');const copy=e('div');copy.append(e('strong','',item.title),e('span','',item.detail));row.append(copy,e('div','mcp-toggle'));group.append(row)}b.append(group);b.append(section('Approvals'));b.append(list([{label:'Purchases',detail:'Always ask before payment or changed terms.',status:'warn',provider:'Ask'},{label:'Important messages',detail:'Ask when recipient, content, or consequence is ambiguous.',status:'warn',provider:'Ask'},{label:'Reservations',detail:'Keep the final confirmation with the human owner.',status:'warn',provider:'Ask'}]));b.append(section('Privacy'));const privacy=e('div','mcp-boundary');privacy.append(e('strong','No credentials in Life Agent state'),e('span','Identity metadata may persist. Passwords, tokens, cookies, MFA material, and payment credentials never do.'));b.append(privacy);return page}
                """;
    }

    private static String routeRenderer() {
        return """
                (d={})=>{const page=shell('Life Agent · capability route',text(d.intent,'Capability first · provider second'),text(d.outcome,'The route is assembled from the outcome, then matched to the host capabilities that can actually perform it.'));const b=body(page);const route=e('div','mcp-route');const nodes=Array.isArray(d.route)&&d.route.length?d.route:[{capability:'Context',provider:'Life Agent',action:'Read relevant preferences',reason:'Start from the outcome.'},{capability:'Calendar',provider:'Google Calendar',action:'Create a private test event',reason:'Schedule consequence.'},{capability:'Email',provider:'Gmail',action:'Prepare a draft',reason:'Communication consequence.'},{capability:'Approval',provider:'Human',action:'Confirm any consequential step',reason:'Keep authority with you.'}];for(const [i,n] of nodes.entries()){if(i)route.append(e('div','mcp-route-arrow','→'));const card=e('article','mcp-route-node');card.append(e('div','eyebrow',text(n.capability,'Capability')),e('div','title',text(n.provider,'Host capability')),e('div','meta',text(n.action,'')),e('div','item-detail',text(n.reason,'')));route.append(card)}b.append(section('Observed route',route));b.append(e('div','mcp-privacy','The route is explanatory. Provider authentication, approval, and mutation live at their owning boundaries.'));return page}
                """;
    }
}
