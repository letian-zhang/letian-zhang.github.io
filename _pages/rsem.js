//Daniel Lewis 2020
'use strict';
var editor
var asm
function initialize(){
    editor = ace.edit("editor");
    editor.setValue("; RSC Emulator Example"+"\n"+
                    "JMP start"+"\n"+
                    "; Variables"+"\n"+
                    "var1: 32"+"\n"+
                    "var2: 33"+"\n"+
                    "start:       ; the label 'start'. The jump statement earlier jumps here"+"\n"+
                    "LDAC var1 ; Load the first variable into Accumulator"+"\n"+
                    "MVAC     ; Move the contents of Accumulator to R"+"\n"+
                    "LDAC var2 ; Load the second variable into Accumulator"+"\n"+
                    "ADD       ; Add Accumulator and R, move result into Accumulator"+"\n"+
                    "OUT       ; Send Accumulator contents to Output Register"+"\n"+
                    "HALT      ; Stop execution"+"\n");
}

function copyDivToClipboard() {
    var range = document.createRange();
    range.selectNode(document.getElementById("code"));
    window.getSelection().removeAllRanges(); // clear current selection
    window.getSelection().addRange(range); // to select text
    document.execCommand("copy");
    window.getSelection().removeAllRanges();// to deselect
}

function assemble(){
    const instruction = {
        HALT : "0",
        LDAC : "1",
        STAC : "2",
        MVAC : "3",
        MOVR : "4",
        JMP : "5",
        JMPZ : "6",
        OUT : "7",
        SUB : "8",
        ADD : "9",
        INC : "10",
        CLAC : "11",
        AND : "12",
        OR : "13",
        ASHR : "14",
        NOT : "15"
    };
    
    let label = {};
    let err = {
        iserr : false,
        problem : [],
        print : function(problem){
            this.iserr = true;
            this.problem.push(problem);
            document.getElementById('display').innerHTML = '';
            this.problem.forEach((p) => {
                console.log(p)
                document.getElementById('display').innerHTML += p + '<br>';
            });
        }
    };
    
    //reads the text from the user
    function read(){
        return editor.getValue(); // or session.getValue
    }
    //remove the comments and empty lines
    //returns a list delimited by newline
    function sanitize(raw){
        //remove comments and turn tabs to spaces
        let asmNoComment = raw.replace(/\r/g,'').replace(/\t/g, ' ').replace(/;.*\n/g, '\n');

        //find and remove empty lines
        let asmLines = asmNoComment.split('\n');
        let asmNoEmpty = [];
        asmLines.forEach((x) => {
            if(x.trim().length){
                asmNoEmpty.push(x.trim());
            }
        })
        return asmNoEmpty;
    }
    //print the assembled program
    function print_code(code){
        if(err.iserr){
            return
        }
        let codeprompt = "CODE";
        let codediv = document.getElementById('codeTitle').innerHTML;        
        if(codeprompt != codediv.split(":")[0]){
            document.getElementById('codeTitle').innerHTML = codeprompt+':';
            document.getElementById('codeTitle').innerHTML += codediv;
        }
        document.getElementById('pos').innerHTML = 'N:<br>';
        document.getElementById('code').innerHTML = '';
        code.forEach((line, index) => {
            document.getElementById('pos').innerHTML += index.toString(16).padStart(4,'0') + ':<br> ';
            document.getElementById('code').innerHTML += (line>>>0).toString(16).padStart(8,'0') + '<br>';
        });
    }

    function prepare_display(){
	
        // document.getElementById('display').innerHTML = '';
        // document.getElementById('display').innerHTML = '<div class="col-sm-1" id="pos"></div><div class="col-sm-2" id="codeTitle"><div id="code"></div></div><div class="col-sm-2" id="mem"></div><div class="col-sm-2" id="debug"></div><div class="col-sm-2" id="trace"></div><div class="col-sm-2" id="output"></div>'
    }
    
    //translate assembly to opcodes and data
    //we'll do 2 passes:
    //first pass will define labels
    //second pass will resolve lables
    function translate(asm){
        let mem = [];
        let error = 0;
        asm.forEach((x, index) => {
            //this fixes the case that labels are not in this form label: N and splits lines on whitespacep
            let line = x.trim().replace(/\s\s+:/g, ': ').split(' ');            
            //either first element in the line is a lable or an instruction
            //line is an instruction
            if(line[0] in instruction){
                mem.push(instruction[line[0]]);
                //we could probably assume one item here
                for(let i = 1; i < line.length; i++){
                    if(line[i].includes(':')){
                        let ln = index + 1;
                        err.print('ERROR: line ' + ln + ': \"' + line[i] + '\" You cannot define a label here. It must be on the left hand side.');
                    }
                    if(line[i] in instruction){
                        let ln = index + 1
                        err.print('ERROR: line ' + ln + ': \"' + line[i] + '\" Do not use an instruction as a value or destination.');
                    }

                    mem.push(line[i]);                    
                }
            //line is a lable
            }else if(line[0].includes(':')){
                let labelname = line[0].replace(':', '');
                if(labelname in instruction){
                    let ln = index + 1
                    err.print('ERROR: line ' + ln + ': \"' + line[0] + '\" Instruction name used as label.');
                }
                //remember where the lable is
                label[labelname] = mem.length;
                //we could probably assume one item here
                for(let i = 1; i < line.length; i++){
                    if(line[i].includes(':')){
                        let ln = index + 1
                        err.print('ERROR: line ' + ln + ': \"' + line[0] + '\" You cannot define a label here. It must be on the left hand side.');
                    }
                    if(line[i] in instruction){
                        let ln = index + 1
                        err.print('ERROR: line ' + ln + ': \"' + line[i] + '\" Do not use an instruction as a value or destination.');
                    }
                    mem.push(line[i]);
                }
            //bad input
            }else{
                let ln = index+1
                err.print('ERROR: line ' + ln + ': \"' + line[0] + '\" is neither a label or an instruction. Did you forget a colon, or mistype an instruction name?');
                error = 1;
            }
        });
        //this is going to mutate mem in place rather than make a new arr.
        //user inputs numbers in hex
        mem.forEach((x, index) => {
            //resolve labels
            if(x in label){
                mem[index] = label[x];
            }
            else{
                try {
                    //parse hex
                    mem[index] = parseInt(mem[index], 10);                
                }catch(error){
                    err.print('ERROR: unknown error. Tried to parse an integer and failed. See console for more info.');
                    console.log(error);
                }
            }
        });
        return mem;
    }
    //clear display 
    prepare_display();
    //process asm
    asm = translate(sanitize(read()));
    //if error return empty list
    if(err.iserr){
        return []
    //code was fine 
    }else{
        print_code(asm);            
        return asm;
    }
}

const ins = {
    HALT : 0,
    LDAC : 1,
    STAC : 2,
    MVAC : 3,
    MOVR : 4,
    JMP : 5,
    JMPZ : 6,
    OUT : 7,
    SUB : 8,
    ADD : 9,
    INC : 10,
    CLAC : 11,
    AND : 12,
    OR : 13,
    ASHR : 14,
    NOT : 15
};


let rsc = {
    code : [],
    stepcnt : 0,
    codelen : 0,
    stopped : 0,
    state : [],
    //create registers
    component : {
        AR : 0,
        IR : 0,
        OUTR : 0,
        DR : 0,
        R : 0,
        ACC : 0,
        PC : 0,
        S : 0,
        Z : 0,
        SC : 0,
        M : [],
        //record of how we got to this state
        trace : [],
    },
    //loads code into memory 
    load : function(input){
        this.code = Array.from(input);
        if(this.code.length){
            this.reset();
        }else{
            this.disable_copy();
        }
        this.flush_output(this);
    },
    //resets the machine
    reset : function(){
        this.reset_trace();
        this.component.AR = 0;
        this.component.IR = 0;
        this.component.OUTR = 0;
        this.component.DR = 0;
        this.component.R = 0;
        this.component.ACC = 0;
        this.component.PC = 0;
        this.component.S = 0;
        this.component.Z = 0;
        this.component.SC = 0;
        this.component.M = Array.from(this.code);
        this.print_debug();
        this.dump_mem();
        this.reset_output();
        this.codelen = this.component.M.length;

        if(this.component.M.length){
            this.enable_run();
            this.enable_asm();
        }
    },
    //enables all buttons
    enable_run : function() {
        document.getElementById("previns").disabled = false;
        document.getElementById("prevstep").disabled = false;
        document.getElementById("ins").disabled = false;
        document.getElementById("tstep").disabled = false;
        document.getElementById("run").disabled = false;
        document.getElementById("stop").disabled = false;
    },
    //enables buttons for assembling and copying code
    enable_asm : function() {
        document.getElementById("asm").disabled = false;
        document.getElementById("copy").disabled = false;
    },
    //disables buttons for forward progress
    disable_run : function() { 
        document.getElementById("ins").disabled = true;
        document.getElementById("tstep").disabled = true;
        document.getElementById("run").disabled = true;
    },
    //disables the stop button
    disable_stop : function() {
        document.getElementById("stop").disabled = true;
    },
    //disables buttons for assembling and copying code
    disable_asm : function() {
        document.getElementById("asm").disabled = true;
        document.getElementById("copy").disabled = true;
    },
    //disables only the copy button
    disable_copy : function() {
        document.getElementById("copy").disabled = true;
    },
    //stop button - for run away code
    _stop : function() {
        this.stopped = 1;
    },
    //resets the output
    reset_output : function() {
        document.getElementById('output').innerHTML = ''        
    },
    //prints the value in each register
    print_debug : function() {
        document.getElementById('debug').innerHTML =
            'REGISTERS:<br>' +
            'AR&nbsp;&nbsp;&nbsp;=  ' + (this.component.AR>>>0).toString(16).padStart(8,'0') + '<br>' +
            'IR&nbsp;&nbsp;&nbsp;= ' + (this.component.IR>>>0).toString(16).padStart(8,'0') + '<br>' +
            'OUTR&nbsp;= ' + (this.component.OUTR>>>0).toString(16).padStart(8,'0') + '<br>' +
            'DR&nbsp;&nbsp;&nbsp;= ' + (this.component.DR>>>0).toString(16).padStart(8,'0') + '<br>' + 
            'R&nbsp;&nbsp;&nbsp;&nbsp;= ' + (this.component.R>>>0).toString(16).padStart(8,'0') + '<br>' +
            'ACC&nbsp;&nbsp;= ' + (this.component.ACC>>>0).toString(16).padStart(8,'0') + '<br>' +
            'PC&nbsp;&nbsp;&nbsp;= ' + (this.component.PC>>>0).toString(16).padStart(8,'0') + '<br>' +
            'S&nbsp;&nbsp;&nbsp;&nbsp;= ' + this.component.S.toString(16) + '<br>' +
            'Z&nbsp;&nbsp;&nbsp;&nbsp;= ' + this.component.Z.toString(16) + '<br>' +
            'SC&nbsp;&nbsp;&nbsp;= ' + this.component.SC.toString(16) + '<br>';
    },
    //record of which instructions led us to this state
    add_to_trace : function(elem){
        this.component.trace.push(elem);
    },
    //resets the trace
    reset_trace : function(){
        this.component.trace = [];
        document.getElementById('trace').innerHTML = 'TRACE:<br>';
    },
    //prints the trace
    display_trace : function(){
        document.getElementById('trace').innerHTML = 'TRACE:<br>';
        this.component.trace.forEach(function(elem) {document.getElementById('trace').innerHTML += elem + '<br>'});
    },
    //dumps a list of what is in memory
    dump_mem : function(){
        let mem = document.getElementById('mem').innerHTML;
        document.getElementById('mem').innerHTML = 'MEMORY:<br>';
        document.getElementById('pos').innerHTML = 'N:<br>';
        this.component.M.forEach((x, i) => {
            document.getElementById('mem').innerHTML += (x>>>0).toString(16).padStart(8,'0') + '<br>';
            document.getElementById('pos').innerHTML += i.toString(16).padStart(4,'0') + ':<br>';
        });
    },
    //one tick of the clock
    T : function(){
        switch(this.component.SC){
        case 0:
            this.component.AR = this.component.PC;
            break;
        case 1:
            this.component.DR = this.component.M[this.component.PC];
            this.component.PC++;
            break;
        case 2:
            this.component.IR = this.component.DR;
            this.component.AR = this.component.PC;
            break;
        }
        switch(this.component.IR){
            //HALT
        case ins.HALT:
            switch(this.component.SC){
            case 3:
                this.add_to_trace("HALT");
                this.component.S = 1;
                this.component.SC = -1;
                break;
            default:
                ;
            }
            break;
            //LDAC
        case ins.LDAC:
            switch(this.component.SC){
            case 3:
                this.add_to_trace("LDAC");
                this.component.DR = this.component.M[this.component.PC++];
                break;
            case 4:
                this.component.AR = this.component.DR;
                break;
            case 5:
                this.component.DR = this.component.M[this.component.AR];
                break;
            case 6:
                this.component.ACC = this.component.DR;
                this.setZ();
                break;
            case 7:
                this.component.SC = -1;
                break;
            default:
                ;
            }
            break;
            //STAC
        case ins.STAC:
            switch(this.component.SC){
            case 3:
                this.add_to_trace("STAC");
                this.component.DR = this.component.M[this.component.PC++];
                break;
            case 4:
                this.component.AR = this.component.DR;
                break;
            case 5:
                this.component.DR = this.component.ACC;
                break;
            case 6:
                this.component.M[this.component.AR] = this.component.DR;
                break;
            case 7:
                this.component.SC = -1;
                break;
            default:
                ;
            }
            break;
            //MVAC
        case ins.MVAC:
            switch(this.component.SC){
            case 3:
                this.add_to_trace("MVAC");
                this.component.R = this.component.ACC;
                break;
            case 4:
                this.component.SC = -1;
                break;
            default:
                ;
            }
            break;
            //MOVR
        case ins.MOVR:
            switch(this.component.SC){
            case 3:
                this.add_to_trace("MOVR");
                this.component.ACC = this.component.R;
                this.setZ();
                break;
            case 4:
                this.component.SC = -1;
                break;
            default:
                ;
            }
            break;
            //JMP
        case ins.JMP:
            switch(this.component.SC){
            case 3:
                this.add_to_trace("JMP");
                this.component.DR = this.component.M[this.component.PC];
                break;
            case 4:
                this.component.PC = this.component.DR;
                break;
            case 5:
                this.component.SC = -1;
                break;
            default:
                ;
            }
            break;
            //JMPZ
        case ins.JMPZ:
            if(this.component.Z == 1){
                switch(this.component.SC){
                case 3:
                    this.add_to_trace("JMPZ Z=1");
                    this.component.DR = this.component.M[this.component.PC];
                    break;
                case 4:
                    this.component.PC = this.component.DR;
                    break;
                case 5:
                    this.component.SC = -1;
                    break;
                default:
                    ;
                }
            }
            else{
                switch(this.component.SC){
                case 3:
                    this.add_to_trace("JMPZ Z=0");
                    this.component.PC++;
                    break;
                case 4:
                    this.component.SC = -1;
                    break;
                default:
                    ;
                }
            }
            break;
            //OUT
        case ins.OUT:
            switch(this.component.SC){
            case 3:
                this.add_to_trace("OUT");
                this.component.OUTR = this.component.ACC;
                break;
            case 4:
                this.component.SC = -1;
                break;
            default:
                ;
            }
            break;
            //SUB
        case ins.SUB:
            switch(this.component.SC){
            case 3:
                this.add_to_trace("SUB");
                this.component.ACC = this.component.ACC - this.component.R;
                this.setZ();
                break;
            case 4:
                this.component.SC = -1;
                break;
            default:
                ;
            }                
            break;
            //ADD
        case ins.ADD:
            switch(this.component.SC){
            case 3:
                this.add_to_trace("ADD");
                this.component.ACC = this.component.ACC + this.component.R;
                this.setZ();
                //return;
                break;
            case 4:
                this.component.SC = -1;
                break;
            }                                
            break;
            //INC
        case ins.INC:
            switch(this.component.SC){
            case 3:
                this.add_to_trace("INC");
                this.component.ACC++;
                this.setZ();
            case 4:
                this.component.SC = -1;
                break;
            }                
            break;
            //CLAC
        case ins.CLAC:
            switch(this.component.SC){
            case 3:
                this.add_to_trace("CLAC");
                this.component.ACC = 0;
		this.setZ();
                break;
            case 4:
                this.component.SC = -1;
                break;
            }                
            break;
            //AND
        case ins.AND:
            switch(this.component.SC){
            case 3:
                this.add_to_trace("AND");
                this.component.ACC = this.component.ACC & this.component.R;
		this.setZ();
                break;
            case 4:
                this.component.SC = -1;
                break;
            }                
            break;
            //OR
        case ins.OR:
            switch(this.component.SC){
            case 3:
                this.add_to_trace("OR");
                this.component.ACC = this.component.ACC | this.component.R;
		this.setZ();
                break;
            case 4:
                this.component.SC = -1;
                break;
            }                
            break;
            //ASHR
        case ins.ASHR:
            switch(this.component.SC){
            case 3:
                this.add_to_trace("ASHR");
                this.component.ACC = this.component.ACC >>> 1;
		this.setZ();
                break;
            case 4:
                this.component.SC = -1;
                break;
            }                
            break;
            //NOT
        case ins.NOT:
            switch(this.component.SC){
            case 3:
                this.add_to_trace("NOT");
                this.component.ACC = ~this.component.ACC;
		this.setZ();
                break;
            case 4:
                this.component.SC = -1;
                break;
            }                
            break;
        }
        this.component.SC++;
    },
    //should be called each time ACC is modified
    setZ : function() {
        if(this.component.ACC == 0){
            this.component.Z = 1;
        }
        else{
            this.component.Z = 0;
        }
    },
    //print to output
    flush_output : function(rsc){
        if(rsc.component.S == 1){
            rsc.disable_run();
            rsc.disable_stop();
        }
        rsc.print_debug();
        rsc.dump_mem();
        rsc.display_trace();
        document.getElementById('output').innerHTML = 'OUTPUT:<br>' + (rsc.component.OUTR>>>0).toString(16).padStart(8,'0');
    }
}

let control = {
    //control and helper functions
    run : function(rsc) {
        rsc.disable_run();
        rsc.stopped = 0;
        control._run(rsc);
    },
    ins : function(rsc) {
        control._ins(rsc);
    },
    prev_ins : function(rsc) {
        control._prev_ins(rsc);
    },
    step : function(rsc) {
        control._step(rsc);
        rsc.stepcnt++;
    },
    prev_step : function(rsc) {
        rsc.stepcnt--;
        control._step(rsc);
    },
    stop : function(rsc){
        rsc.enable_asm();
        rsc.enable_run();
        control._stop(rsc);
    },
    //step to next state
    _step : function(rsc){
        rsc.flush_output(rsc);
        //first step
        if(!rsc.stepcnt){
            //load
            rsc.component.M = Array.from(rsc.code);
            //remember the length of the original code
            rsc.codelen = rsc.component.M.length;
        }
        //going backwards
        if(rsc.stepcnt < rsc.state.length){
            rsc.component = rsc.state[rsc.stepcnt];
            rsc.enable_run();
        }
        //going forwards
        else{
            console.log(rsc.component);
            rsc.state.push(JSON.parse(JSON.stringify(rsc.component)));
            rsc.T();
        }
        rsc.flush_output(rsc);
    },
    //execute next instruction
    _ins : function(rsc){
        let complete = 0
        rsc.stepcnt++;
        control._step(rsc);
        while(rsc.component.SC != 0){
            rsc.stepcnt++;
            control._step(rsc);
        }
    },
    //execute next instruction
    _prev_ins : function(rsc){
        let complete = 0
        rsc.stepcnt--;
        control._step(rsc);
        while(rsc.component.SC != 0){
            rsc.stepcnt--;
            control._step(rsc);
        }
    },
    //run until HALT
    _run : function(rsc){
        if(!rsc.component.S && !rsc.stopped) {
            control.step(rsc);
            setTimeout(control._run, 0, rsc);
        }
    }
}
