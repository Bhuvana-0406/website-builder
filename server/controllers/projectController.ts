import {Request,Response} from 'express'
import prisma from "../lib/prisma.js";
import openai from "../configs/openai.js";

// controller function to make Revision 
export const makeRevision = async(req:Request,res:Response)=>{
    const userId = req.userId;
    try{
        
        const projectId = Array.isArray(req.params.projectId)
            ? req.params.projectId[0]
            : req.params.projectId;
        
        const {message} = req.body;
        const user = await prisma.user.findUnique({
            where: {id:userId}
        })
        if(!userId || !user){
            return res.status(401).json({message: 'Unauthorized'});
        }
        if(user.credits < 5){
            return res.status(403).json({message: 'add more credits to make changes'});
        }
        if(!message || message.trim() === ''){
            return res.status(400).json({message: 'please enter a valid prompt'});
        }

        const currentProject = await prisma.websiteProject.findFirst({ // ✅ changed
            where: {id:projectId,userId},
            include: {versions: true}
        })

        if(!currentProject){
            return res.status(404).json({message: 'Project not found'});
        }

        await prisma.conversation.create({
            data: {
                role: 'user',
                content: message,
                projectId
            }
        })
        await prisma.user.update({
            where: {id: userId},
            data: {credits: {decrement: 5}}
        })

        const promptEnhanceResponse = await openai.chat.completions.create({
            model: 'stepfun/step-3.5-flash:free',
            messages: [
                {
                    role: 'system',
                    content: `
                    You are a changes enhancement specialist.
                    Take the user's change request and expand it into a detailed set of modification instructions for an EXISTING single-page Tailwind HTML website.

    Enhance this request by:
    1. Converting it into specific edit instructions (what to change/add/remove)
    2. Specifying which UI sections/components are affected
    3. Keeping the overall layout and components the same unless the change requires otherwise
    4. Ensuring responsive behavior stays consistent
    5. Adding missing but important details needed to implement the changes correctly

Return ONLY the enhanced changes instructions, nothing else. Make it detailed but concise (2-3 paragraphs max).`
                },
                {
                    role: 'user',
                    content: `User's request : "${message}"`
                }
            ]
        })

        const enhancedPrompt = promptEnhanceResponse.choices[0].message.content;

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: `I've enhanced your prompt to : "${enhancedPrompt}"`,
                projectId
            }
        })

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: `Now making changes to your website"`,
                projectId
            }
        })

        const codeGenerationResponse = await openai.chat.completions.create({
            model: 'stepfun/step-3.5-flash:free',
            messages: [
                {
                    role: 'system',
                    content: `
                    You are an expert web developer.
                    You will be given the CURRENT full HTML of a single-page website and a list of REQUESTED CHANGES.
                    Update the CURRENT HTML to implement the requested changes.

    CRITICAL REQUIREMENTS:
    - Do NOT regenerate from scratch.
    - Preserve the existing structure, components, and styling unless the requested changes require modifications.
    - Output only the UPDATED complete HTML for the entire page.
    - You MUST output valid HTML ONLY. 
    - Use Tailwind CSS for ALL styling
    - Include this EXACT script in the <head>: <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    - Use Tailwind utility classes extensively for styling, animations, and responsiveness
    - Make it fully functional and interactive with JavaScript in <script> tag before closing </body>
    - Use modern, beautiful design with great UX using Tailwind classes
    - Make it responsive using Tailwind responsive classes (sm:, md:, lg:, xl:)
    - Use Tailwind animations and transitions (animate-*, transition-*)
    - Include all necessary meta tags
    - Use Google Fonts CDN if needed for custom fonts
    - Use placeholder images from https://placehold.co/600x400
    - Use Tailwind gradient classes for beautiful backgrounds
    - Make sure all buttons, cards, and components use Tailwind styling

    CRITICAL HARD RULES:
    1. You MUST put ALL output ONLY into message.content.
    2. You MUST NOT place anything in "reasoning", "analysis", "reasoning_details", or any hidden fields.
    3. You MUST NOT include internal thoughts, explanations, analysis, comments, or markdown.
    4. Do NOT include markdown, explanations, notes, or code fences.

    The HTML should be complete and ready to render as-is with Tailwind CSS.`
                },
                {
                    role: 'user',
                    content: `CURRENT HTML:
${currentProject.current_code}

REQUESTED CHANGES:
${enhancedPrompt}

Return ONLY the updated full HTML page.`
                }
            ]
        })

        const code = codeGenerationResponse.choices[0].message.content || '';
        if(!code){
            await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: "Unable to generate the code,please try again",
                projectId
            }
        })
        await prisma.user.update({
            where: {id: userId},
            data: {credits: {increment: 5}}
        })
        return;
        }
        const version = await prisma.version.create({
            data: {
                code: code.replace(/```[a-z]*\n?/gi, '')
                    .replace(/```$/g, '')
                    .trim(),
                description: 'changes made',
                projectId 
            }
        })

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: "I've made changes to your website you can now preview it",
                projectId
            }
        })

        await prisma.websiteProject.update({
            where: {id: projectId},
            data: {
                current_code: code.replace(/```[a-z]*\n?/gi, '')
                    .replace(/```$/g, '')
                    .trim(),
                current_version_index: version.id
            }
        })

        res.json({message: 'changes made successfully'})

    } catch (error:any){
        await prisma.user.update({
            where: {id: userId},
            data: {credits: {increment: 5}}
        })
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message});
    }
}

// controller function to rollback to a specific version 
export const rollbackToVersion = async(req:Request,res:Response)=>{
    try {
        const userId = req.userId;
        if(!userId){
            return res.status(401).json({message: 'Unauthorized'});
        }
        const projectId = Array.isArray(req.params.projectId)
            ? req.params.projectId[0]
            : req.params.projectId;
        const {versionId} = req.params;
        const project = await prisma.websiteProject.findUnique({
            where: {id: projectId,userId},
            include: {versions:true}
        })
        if(!project){
            return res.status(404).json({message: 'Project not found'});
        }
        const version = project.versions.find((version)=>version.id === versionId);
        if(!version){
            return res.status(404).json({message: 'version not found'});
        }
        await prisma.websiteProject.update({
            where: {id: projectId,userId},
            data: {
                current_code: version.code,
                current_version_index: version.id
            }
        })

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: "I've rolled back your website to selected version.You can now preview it",
                projectId
            }
        })
        res.json({message: 'version rolled back'});
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message});
    }
}

// controller function to delete a project 
export const deleteProject = async(req:Request,res:Response)=>{
    try {
        const userId = req.userId;
         const projectId = Array.isArray(req.params.projectId)
            ? req.params.projectId[0]
            : req.params.projectId;
        await prisma.websiteProject.delete({
            where: {id: projectId,userId},
        })
        
        res.json({message: 'Project deleted successfully'});
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message});
    }
}

// contoller for getting project code for preview 
export const getProjectPreview = async(req:Request,res:Response)=>{
    try {
        const userId = req.userId;
         const projectId = Array.isArray(req.params.projectId)
            ? req.params.projectId[0]
            : req.params.projectId;

        if(!userId){
            return res.status(401).json({message: 'Unauthorized'});
        }

        const project = await prisma.websiteProject.findFirst({
            where: {id : projectId,userId},
            include: {versions:true}

        })
        if(!project){
            return res.status(404).json({message: 'Project not found'});
        }
        res.json({project});
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message});
    }
}

// get published projects 
export const getPublishedProjects = async(req:Request,res:Response)=>{
    try {

        const projects = await prisma.websiteProject.findMany({
            where: {isPublished: true},
            include: {user:true}

        })
        res.json({projects});
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message});
    }
}

// getting single project by id 
export const getProjectById = async(req:Request,res:Response)=>{
    try {
        const projectId = Array.isArray(req.params.projectId)
            ? req.params.projectId[0]
            : req.params.projectId;
        const project = await prisma.websiteProject.findFirst({
            where: {id: projectId},

        })
        if(!project || project?.isPublished === false || !project?.current_code){
            return res.status(404).json({message: 'Project not found'});
        }
        res.json({code: project.current_code});
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message});
    }
}

// controller function to save the project
export const saveProjectCode = async(req:Request,res:Response)=>{
    try {
        const userId = req.userId;
        const projectId = Array.isArray(req.params.projectId)
            ? req.params.projectId[0]
            : req.params.projectId;
        const {code} = req.body;

        if(!userId){
            return res.status(401).json({message: 'Unauthorized'});
        }
        if(!code){
            return res.status(400).json({message: 'Code is required'});
        }
        const project = await prisma.websiteProject.findUnique({
            where: {id: projectId,userId}
        })
        if(!project){
            return res.status(404).json({message: 'Project not found'});
        }
        await prisma.websiteProject.update({
            where : {id: projectId},
            data: {current_code: code,current_version_index: ''}
        })
        res.json({message: 'Project saved successfully'});
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message});
    }
}